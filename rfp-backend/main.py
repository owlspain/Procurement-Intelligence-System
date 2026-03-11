import io
import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import boto3
print("BOTO3 SESSION PROFILE:",boto3.Session().profile_name)
print("BOTO3 CREDS METHOD:",boto3.Session().get_credentials().method)
import pypdf
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BUCKET          = os.getenv("S3_BUCKET", "rfp-tprm-agent")
EXPIRY          = 300  # seconds
DYNAMODB_TABLE  = "vendor_uploads"
MASTER_TABLE    = "questionaire_master"
QUESTIONS_TABLE = "Questionaire_questions"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

s3_client = boto3.client(
    "s3",
    config=Config(signature_version="s3v4"),
)

_rfp_session = boto3.Session(profile_name="rfp-infra")
_rfp_s3_session = boto3.Session(profile_name="default")
rfp_s3_cli=_rfp_s3_session.client("s3", config=Config(signature_version="s3v4"))
dynamodb     = _rfp_session.resource("dynamodb", region_name="us-east-1")
_rfp_s3      = _rfp_session.client("s3", config=Config(signature_version="s3v4"))


# ── Shared table helpers ────────────────────────────────────────────────────────

def _vendor_table():
    return dynamodb.Table(DYNAMODB_TABLE)

def _master_table():
    return dynamodb.Table(MASTER_TABLE)

def _questions_table():
    return dynamodb.Table(QUESTIONS_TABLE)


# ── Chunking helpers (module-level, shared by register-vendor & document-test) ──

CHUNK_SIZE = 400
OVERLAP    = 80


def _extract_pdf_text(s3_key: str) -> str:
    """Download PDF from S3 (rfp-infra) and extract full text via pypdf."""
    try:
        obj        = _rfp_s3.get_object(Bucket=BUCKET, Key=s3_key)
        body_bytes = obj["Body"].read()
    except ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"S3 get_object failed for '{s3_key}': {e.response['Error']['Message']}",
        )
    reader = pypdf.PdfReader(io.BytesIO(body_bytes))
    return "".join(page.extract_text() or "" for page in reader.pages)


def _chunk_text(text: str, prefix: str) -> list:
    chunks, start, idx = [], 0, 1
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append({
            "chunk_id":   f"{prefix}-{idx:03d}",
            "text":       text[start:end],
            "char_start": start,
            "char_end":   min(end, len(text)),
        })
        start += CHUNK_SIZE - OVERLAP
        idx   += 1
    return chunks


def _to_jsonl(chunks: list) -> bytes:
    return "\n".join(json.dumps(c) for c in chunks).encode("utf-8")


def _upload_chunks_jsonl(chunks: list, s3_key: str):
    """Upload JSONL to S3 using default profile (write access)."""
    try:
        rfp_s3_cli.put_object(
            Bucket=BUCKET,
            Key=s3_key,
            Body=_to_jsonl(chunks),
            ContentType="application/jsonl",
        )
    except ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"S3 put_object failed for '{s3_key}': {e.response['Error']['Message']}",
        )


def _chunk_and_upload_documents(vendor_id: str, sow_key: str, msa_key: str) -> dict:
    """Extract text, chunk, upload JSONL for both SOW and MSA. Returns chunk counts."""
    sow_text   = _extract_pdf_text(sow_key)
    msa_text   = _extract_pdf_text(msa_key)
    sow_chunks = _chunk_text(sow_text, "sow")
    msa_chunks = _chunk_text(msa_text, "msa")
    _upload_chunks_jsonl(sow_chunks, f"uploads/chunks/{vendor_id}/sow.jsonl")
    _upload_chunks_jsonl(msa_chunks, f"uploads/chunks/{vendor_id}/msa.jsonl")
    return {
        "sow_chunks": len(sow_chunks),
        "msa_chunks": len(msa_chunks),
        "sow_text_length": len(sow_text),
        "msa_text_length": len(msa_text),
    }


# ── S3 presigned URL ────────────────────────────────────────────────────────────

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
}


class PresignRequest(BaseModel):
    doc_type:     str   # "msa" or "sow"
    filename:     str
    content_type: str


@app.post("/presigned-url")
def get_presigned_url(req: PresignRequest):
    if req.doc_type not in ("msa", "sow"):
        raise HTTPException(status_code=400, detail="doc_type must be 'msa' or 'sow'")

    if req.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")

    unique_key = f"uploads/{req.doc_type}/{uuid.uuid4()}_{req.filename}"

    try:
        url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket":      BUCKET,
                "Key":         unique_key,
                "ContentType": req.content_type,
            },
            ExpiresIn=EXPIRY,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"url": url, "key": unique_key}


# ── Vendor endpoints ────────────────────────────────────────────────────────────

class RegisterVendorRequest(BaseModel):
    sow_key: str
    msa_key: str


def _generate_vendor_id() -> str:
    """V + first 8 uppercase hex chars from uuid4 = 9-char vendor ID."""
    return "V" + uuid.uuid4().hex[:8].upper()


@app.post("/register-vendor")
def register_vendor(req: RegisterVendorRequest):
    table = _vendor_table()

    # Check if this SOW + MSA combo already exists
    try:
        scan_resp = table.scan(
            FilterExpression=(
                boto3.dynamodb.conditions.Attr("SOW_Key").eq(req.sow_key) &
                boto3.dynamodb.conditions.Attr("MSA_Key").eq(req.msa_key)
            ),
            ProjectionExpression="vendor_id",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB scan failed: {e}")

    if scan_resp.get("Items"):
        return {"vendor_id": scan_resp["Items"][0]["vendor_id"], "created": False}

    # Create new vendor record with default review_status
    vendor_id = _generate_vendor_id()
    try:
        table.put_item(
            Item={
                "vendor_id":     vendor_id,
                "SOW_Key":       req.sow_key,
                "MSA_Key":       req.msa_key,
                "review_status": "NOT_STARTED",
            },
            ConditionExpression=boto3.dynamodb.conditions.Attr("vendor_id").not_exists(),
        )
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "ConditionalCheckFailedException":
            raise HTTPException(status_code=409, detail="Vendor ID collision, please retry")
        raise HTTPException(status_code=500, detail=f"DynamoDB write failed: {e}")

    # Chunk documents and upload JSONL to S3
    chunk_info = _chunk_and_upload_documents(vendor_id, req.sow_key, req.msa_key)

    # Update review_status now that documents are chunked
    try:
        table.update_item(
            Key={"vendor_id": vendor_id, "SOW_Key": req.sow_key},
            UpdateExpression="SET review_status = :s",
            ExpressionAttributeValues={":s": "DOCUMENT_UPLOADED_REVIEW_NOT_STARTED"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status update failed: {e}")

    return {
        "vendor_id":     vendor_id,
        "created":       True,
        "review_status": "DOCUMENT_UPLOADED_REVIEW_NOT_STARTED",
        **chunk_info,
    }


@app.get("/vendors")
def list_vendors():
    """Return all vendor records from vendor_uploads table."""
    table = _vendor_table()
    try:
        resp = table.scan(
            ProjectionExpression="vendor_id, SOW_Key, MSA_Key, review_status"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB scan failed: {e}")

    items = sorted(resp["Items"], key=lambda x: x["vendor_id"])
    return {"vendors": items, "count": len(items)}


@app.get("/vendors/{vendor_id}")
def get_vendor(vendor_id: str):
    """Return SOW_Key and MSA_Key for a specific vendor."""
    table = _vendor_table()
    try:
        resp = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("vendor_id").eq(vendor_id),
            ProjectionExpression="vendor_id, SOW_Key, MSA_Key, review_status",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB query failed: {e}")

    items = resp.get("Items", [])
    if not items:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_id}' not found")

    item = items[0]
    return {
        "vendor_id":     item["vendor_id"],
        "sow_key":       item["SOW_Key"],
        "msa_key":       item["MSA_Key"],
        "review_status": item.get("review_status", "NOT_STARTED"),
    }


@app.get("/api/vendors/{vendor_id}/documents/document-test")
def document_test(vendor_id: str):
    """Re-chunk and re-upload SOW/MSA for a vendor. Uses shared _chunk_and_upload_documents."""
    table = _vendor_table()
    try:
        resp = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("vendor_id").eq(vendor_id),
            ProjectionExpression="vendor_id, SOW_Key, MSA_Key",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB query failed: {e}")

    items = resp.get("Items", [])
    if not items:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_id}' not found")

    sow_key    = items[0]["SOW_Key"]
    msa_key    = items[0]["MSA_Key"]
    chunk_info = _chunk_and_upload_documents(vendor_id, sow_key, msa_key)

    return {"vendor_id": vendor_id, **chunk_info, "sow_chunks_saved": True, "msa_chunks_saved": True}


# ── LLM test endpoint ───────────────────────────────────────────────────────────

_bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

HAIKU_MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"


class LLMTestRequest(BaseModel):
    prompt: str


@app.post("/api/llm/test")
def llm_test(req: LLMTestRequest):
    """Minimal Bedrock invoke test — no retrieval, just prompt → text."""
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [
            {"role": "user", "content": req.prompt}
        ],
    }
    try:
        resp = _bedrock.invoke_model(
            modelId=HAIKU_MODEL_ID,
            body=json.dumps(payload),
            contentType="application/json",
            accept="application/json",
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Bedrock invoke failed: {e.response['Error']['Message']}")

    result = json.loads(resp["body"].read())
    text   = result["content"][0]["text"]
    return {"text": text}


# ── Retrieve endpoint ───────────────────────────────────────────────────────────

class RetrieveRequest(BaseModel):
    question: str


STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "can", "could", "not", "no", "nor", "so",
    "yet", "both", "either", "as", "if", "than", "that", "this", "these",
    "those", "its", "it", "we", "our", "you", "your", "they", "their",
    "what", "which", "who", "how", "when", "where", "any", "all", "each",
}

PHRASE_BOOST_LIST = [
    "confidential", "encrypt", "breach", "retention", "subprocessor",
    "third-party", "incident", "audit", "hosted", "cloud",
]


def _preprocess(text: str) -> list:
    """Lowercase → strip punctuation → tokenise → remove stopwords and short tokens."""
    import re
    cleaned = re.sub(r"[^\w\s-]", "", text.lower())
    tokens  = cleaned.split()
    return [t for t in tokens if len(t) >= 3 and t not in STOPWORDS]


def _load_jsonl_from_s3(s3_key: str, doc_type: str) -> list:
    try:
        obj   = _rfp_s3.get_object(Bucket=BUCKET, Key=s3_key)
        lines = obj["Body"].read().decode("utf-8").splitlines()
    except ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"S3 get_object failed for '{s3_key}': {e.response['Error']['Message']}",
        )
    chunks = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        chunk = json.loads(line)
        chunk["doc_type"] = doc_type
        chunks.append(chunk)
    return chunks


def _score_chunk(chunk: dict, q_tokens: set) -> dict:
    text_lower       = chunk["text"].lower()
    matched_keywords = [t for t in q_tokens if t in text_lower]
    matched_phrases  = [p for p in PHRASE_BOOST_LIST if p in text_lower]
    return {
        "chunk_id":         chunk["chunk_id"],
        "doc_type":         chunk["doc_type"],
        "score":            len(matched_keywords) + len(matched_phrases) * 3,
        "matched_keywords": matched_keywords,
        "matched_phrases":  matched_phrases,
        "text":             chunk["text"],
        "preview":          chunk["text"][:400],
    }


def _retrieve_top_chunks(vendor_id: str, question: str, top_k: int = None) -> tuple:
    """Returns (q_tokens, top_scored_chunks). Shared by /retrieve and /answer.
    Pass top_k=None to return all scored chunks."""
    sow_chunks = _load_jsonl_from_s3(f"uploads/chunks/{vendor_id}/sow.jsonl", "SOW")
    msa_chunks = _load_jsonl_from_s3(f"uploads/chunks/{vendor_id}/msa.jsonl", "MSA")
    all_chunks = sow_chunks + msa_chunks

    q_tokens = set(_preprocess(question))
    scored   = [_score_chunk(c, q_tokens) for c in all_chunks]
    scored   = [c for c in scored if c["score"] > 0]
    scored.sort(key=lambda c: c["score"], reverse=True)
    return q_tokens, scored if top_k is None else scored[:top_k]


@app.post("/api/vendors/{vendor_id}/retrieve")
def retrieve_chunks(vendor_id: str, req: RetrieveRequest):
    """Load SOW and MSA chunks from S3, score with keyword hits + phrase boost, return top-3."""
    q_tokens, top_chunks = _retrieve_top_chunks(vendor_id, req.question)
    return {
        "vendor_id":  vendor_id,
        "question":   req.question,
        "q_tokens":   sorted(q_tokens),
        "top_chunks": top_chunks,
    }


# ── Answer endpoint ──────────────────────────────────────────────────────────────

class AnswerRequest(BaseModel):
    question: str


ANSWER_PROMPT_TEMPLATE = """\
You are a TPRM (Third Party Risk Management) analyst. Answer the question using ONLY the evidence blocks below.

Evidence:
__EVIDENCE__

Question: __QUESTION__

Rules:
- Answer strictly from the evidence. Do not infer or guess.
- If the answer cannot be determined from the evidence, set answer_value to "Insufficient Evidence".
- citation must contain only the chunk IDs (e.g. "sow-003", "msa-001") from the evidence above. Do NOT use "e1", "e2" etc.
- If answer_value is "Insufficient Evidence", citation must be [].
- confidence is a float between 0.0 and 1.0.
- Output MUST be valid JSON only. No markdown, no extra text, no code fences.

Output this exact JSON schema:
{
  "vendor_id": "__VENDOR_ID__",
  "question": "__QUESTION__",
  "answer_value": "Yes | No | Insufficient Evidence",
  "answer_state": "SUPPORTED | INFERRED | INSUFFICIENT_EVIDENCE",
  "confidence": 0.0,
  "citation": ["chunk-id-1", "chunk-id-2"],
  "rationale": "Max 2 lines explaining the answer.",
  "suggestion": "Max 1 line on what additional evidence would help (if any)."
}"""


SYSTEM_GUARDRAIL = (
    "You are a vendor risk assessment assistant. "
    "You must ONLY answer using the provided evidence chunks. "
    "Do not use general knowledge. "
    "If the evidence does not explicitly support a yes or no answer, "
    "return answer_value=\"INSUFFICIENT EVIDENCE\", "
    "answer_state=\"INSUFFICIENT_EVIDENCE\", citation=[], confidence=0.0. "
    "Never guess. Never infer beyond what is written. "
    "Return valid JSON only."
)

# ── Text-question answer prompt ───────────────────────────────────────────────────
TEXT_ANSWER_PROMPT_TEMPLATE = """\
You are a TPRM (Third Party Risk Management) analyst. Answer the question with a concise factual text response using ONLY the evidence blocks below.

Evidence:
__EVIDENCE__

Question: __QUESTION__

Rules:
- Answer strictly from the evidence. Do not infer or use general knowledge.
- answer_value must be a direct, factual text response (2-4 sentences). Do NOT answer Yes or No.
- If the question cannot be answered from the evidence, set answer_value to "Insufficient information found in vendor documents" and citation to [].
- citation must contain only the chunk IDs (e.g. "sow-003", "msa-001") from the evidence above. Do NOT use "e1", "e2" etc.
- confidence is a float between 0.0 and 1.0.
- Output MUST be valid JSON only. No markdown, no extra text, no code fences.

Output this exact JSON schema:
{
  "vendor_id": "__VENDOR_ID__",
  "question": "__QUESTION__",
  "answer_value": "<2-4 sentence factual text answer>",
  "answer_state": "SUPPORTED | INSUFFICIENT_EVIDENCE",
  "confidence": 0.0,
  "citation": ["chunk-id-1", "chunk-id-2"],
  "rationale": "Max 2 lines explaining the answer.",
  "suggestion": "Max 1 line on what additional evidence would help (if any)."
}"""

TEXT_SYSTEM_GUARDRAIL = (
    "You are a vendor risk assessment assistant. "
    "You must ONLY answer using the provided evidence chunks. "
    "Do not use general knowledge. "
    "Provide a concise factual text answer — do NOT respond with Yes or No. "
    "If the evidence does not address the question, "
    "return answer_value=\"Insufficient information found in vendor documents\", "
    "answer_state=\"INSUFFICIENT_EVIDENCE\", citation=[], confidence=0.0. "
    "Never guess. Never infer beyond what is written. "
    "Return valid JSON only."
)

REVIEWER_PROMPT_TEMPLATE = """\
You are a contract risk reviewer validating an AI answer.

Inputs:
Question: __QUESTION__
Assistant Answer: __AI_ANSWER__
Evidence: __EVIDENCE__

Your job:
Check whether the assistant answer is contradicted by the evidence.

Decision rules:

SUPPORTED
- Evidence directly supports the assistant answer.
- Minor wording differences are acceptable.
- Textual answers with relevant citation count as supported.

INSUFFICIENT_EVIDENCE
- The evidence does not discuss the topic asked in the question.
- The contract is silent about the policy.

REVIEW_REQUIRED
- Two or more clauses clearly conflict regarding the SAME policy.
- Evidence both supports AND rejects the assistant answer.

Important:
Do NOT mark REVIEW_REQUIRED just because the answer is broad, inferred, or partially supported.
Only mark REVIEW_REQUIRED for direct contradictions.

Return ONLY one word:
SUPPORTED
INSUFFICIENT_EVIDENCE
REVIEW_REQUIRED"""


_VALID_VERDICTS = {"SUPPORTED", "INSUFFICIENT_EVIDENCE", "REVIEW_REQUIRED"}


def _get_reviewer_verdict(question: str, answer: dict, evidence_block: str) -> str:
    """Call reviewer LLM. Returns 'SUPPORTED', 'INSUFFICIENT_EVIDENCE', or 'REVIEW_REQUIRED'."""
    ai_answer_summary = (
        f"Answer: {answer.get('answer_value', '')}\n"
        f"Rationale: {answer.get('rationale', '')}"
    )
    prompt = (
        REVIEWER_PROMPT_TEMPLATE
        .replace("__QUESTION__",  question)
        .replace("__AI_ANSWER__", ai_answer_summary)
        .replace("__EVIDENCE__",  evidence_block)
    )
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens":        16,
        "messages": [{"role": "user", "content": prompt}],
    }
    try:
        resp    = _bedrock.invoke_model(
            modelId=HAIKU_MODEL_ID,
            body=json.dumps(payload),
            contentType="application/json",
            accept="application/json",
        )
        result  = json.loads(resp["body"].read())
        verdict = result["content"][0]["text"].strip().upper()
    except ClientError:
        return "REVIEW_REQUIRED"

    return verdict if verdict in _VALID_VERDICTS else "REVIEW_REQUIRED"


def _get_llm_answer(vendor_id: str, question: str, question_type: str = "YES_NO") -> tuple:
    """
    Core answer logic — retrieve chunks, build evidence, call Bedrock.
    Uses TEXT_ANSWER_PROMPT_TEMPLATE for non-YES_NO questions so the model
    returns a factual text answer rather than Yes/No.
    Returns (answer_dict, top_chunks).
    Raises HTTPException on Bedrock or parse failure.
    """
    _, top_chunks = _retrieve_top_chunks(vendor_id, question, top_k=None)

    evidence_lines = [
        f"[e{i+1}] [{c['chunk_id']}]: {c['text']}"
        for i, c in enumerate(top_chunks)
    ]
    evidence_block = "\n\n".join(evidence_lines)

    if question_type == "YES_NO":
        prompt_template  = ANSWER_PROMPT_TEMPLATE
        system_guardrail = SYSTEM_GUARDRAIL
    else:
        prompt_template  = TEXT_ANSWER_PROMPT_TEMPLATE
        system_guardrail = TEXT_SYSTEM_GUARDRAIL

    prompt = (
        prompt_template
        .replace("__EVIDENCE__",  evidence_block)
        .replace("__VENDOR_ID__", vendor_id)
        .replace("__QUESTION__",  question)
    )

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "system": system_guardrail,
        "messages": [{"role": "user", "content": prompt}],
    }
    try:
        resp   = _bedrock.invoke_model(
            modelId=HAIKU_MODEL_ID,
            body=json.dumps(payload),
            contentType="application/json",
            accept="application/json",
        )
        result = json.loads(resp["body"].read())
        raw    = result["content"][0]["text"].strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.rsplit("```", 1)[0].strip()
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Bedrock invoke failed: {e.response['Error']['Message']}")

    try:
        answer = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"Model returned non-JSON output: {raw}")

    # Reviewer pass — overwrite answer_state with reviewer verdict
    answer["answer_state"] = _get_reviewer_verdict(question, answer, evidence_block)

    return answer, top_chunks


@app.post("/api/vendors/{vendor_id}/answer")
def answer_question(vendor_id: str, req: AnswerRequest):
    """Single-question answer endpoint."""
    answer, top_chunks = _get_llm_answer(vendor_id, req.question)
    answer["evidence_chunks"] = [
        {"chunk_id": c["chunk_id"], "doc_type": c["doc_type"], "preview": c["preview"]}
        for c in top_chunks
    ]
    return answer


# ── Run questionnaire endpoint ───────────────────────────────────────────────────

_VENDOR_ANSWERS_TABLE = "vendor_answers"


@app.post("/api/vendors/{vendor_id}/run-questionaire/{questionaire_id}")
def run_questionaire(vendor_id: str, questionaire_id: str):
    """
    Loop all questions for the questionaire_id, call LLM for each,
    persist answers to vendor_answers table, return summary counts.
    """
    # 1. Fetch all questions for this questionnaire
    q_table = _questions_table()
    try:
        resp = q_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("questionaire_id").eq(questionaire_id)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB query failed: {e}")

    questions = resp.get("Items", [])
    if not questions:
        raise HTTPException(status_code=404, detail=f"No questions found for questionnaire '{questionaire_id}'")

    questions = sorted(questions, key=lambda x: x["question_id"])

    # 2. Loop, answer, persist
    answers_table = dynamodb.Table(_VENDOR_ANSWERS_TABLE)
    counts  = {"total": 0, "supported": 0, "insufficient": 0, "review_required": 0}
    results = []

    for q in questions:
        question_text = q["question_text"]
        question_id   = q["question_id"]
        question_type = q.get("question_type", "YES_NO")
        sort_key      = f"{questionaire_id}#{question_id}"

        try:
            answer, _ = _get_llm_answer(vendor_id, question_text, question_type)
        except HTTPException as e:
            # Record failure and continue with remaining questions
            answer = {
                "answer_value":  "ERROR",
                "answer_state":  "INSUFFICIENT_EVIDENCE",
                "confidence":    0.0,
                "citation":      [],
                "rationale":     f"LLM call failed: {e.detail}",
                "suggestion":    "",
            }

        state = answer.get("answer_state", "REVIEW_REQUIRED")
        counts["total"] += 1
        if state == "SUPPORTED":
            counts["supported"] += 1
        elif state == "INSUFFICIENT_EVIDENCE":
            counts["insufficient"] += 1
        else:
            counts["review_required"] += 1

        try:
            answers_table.put_item(Item={
                "vendor_id":     vendor_id,
                "sort_key":      sort_key,
                "question_text": question_text,
                "answer_value":  answer.get("answer_value", ""),
                "answer_state":  state,
                "confidence":    Decimal(str(answer.get("confidence", 0.0))),
                "citations":     answer.get("citation", []),
                "rationale":     answer.get("rationale", ""),
                "suggestion":    answer.get("suggestion", ""),
                "updated_at":    datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DynamoDB write failed for {sort_key}: {e}")

        results.append({
            "question_id":   question_id,
            "question_text": question_text,
            "answer_value":  answer.get("answer_value", ""),
            "answer_state":  state,
        })

    # Determine new review_status
    try:
        # Get vendor SOW_Key for update
        vendor_resp  = _vendor_table().query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("vendor_id").eq(vendor_id),
            ProjectionExpression="vendor_id, SOW_Key",
        )
        vendor_items = vendor_resp.get("Items", [])
        if not vendor_items:
            raise HTTPException(status_code=404, detail=f"Vendor '{vendor_id}' not found")
        sow_key_for_update = vendor_items[0]["SOW_Key"]

        # Get all active questionnaire IDs from master table
        all_qn_resp = _master_table().scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("active_ind").eq(True),
            ProjectionExpression="questionaire_id",
        )
        all_qn_ids = {item["questionaire_id"] for item in all_qn_resp.get("Items", [])}

        # Get distinct questionnaire IDs that have answers for this vendor (with pagination)
        reviewed_qn_ids = set()
        ans_resp = dynamodb.Table(_VENDOR_ANSWERS_TABLE).query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("vendor_id").eq(vendor_id),
            ProjectionExpression="sort_key",
        )
        for item in ans_resp.get("Items", []):
            reviewed_qn_ids.add(item["sort_key"].split("#")[0])
        while "LastEvaluatedKey" in ans_resp:
            ans_resp = dynamodb.Table(_VENDOR_ANSWERS_TABLE).query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key("vendor_id").eq(vendor_id),
                ProjectionExpression="sort_key",
                ExclusiveStartKey=ans_resp["LastEvaluatedKey"],
            )
            for item in ans_resp.get("Items", []):
                reviewed_qn_ids.add(item["sort_key"].split("#")[0])

        # Completed only when every active questionnaire has been reviewed
        if all_qn_ids and all_qn_ids.issubset(reviewed_qn_ids):
            new_status = "AI_REVIEW_COMPLETED"
        else:
            new_status = "AI_REVIEW_STARTED"

        _vendor_table().update_item(
            Key={"vendor_id": vendor_id, "SOW_Key": sow_key_for_update},
            UpdateExpression="SET review_status = :s",
            ExpressionAttributeValues={":s": new_status},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"review_status update failed: {e}")

    return {
        "vendor_id":        vendor_id,
        "questionaire_id":  questionaire_id,
        "total":            counts["total"],
        "supported":        counts["supported"],
        "insufficient":     counts["insufficient"],
        "review_required":  counts["review_required"],
        "review_status":    new_status,
        "answers":          results,
    }


# ── Vendor answers read endpoint ────────────────────────────────────────────────

@app.get("/api/vendors/{vendor_id}/answers/{questionaire_id}/{question_id}")
def get_vendor_answer(vendor_id: str, questionaire_id: str, question_id: str):
    """Fetch a single saved answer from vendor_answers table."""
    sort_key = f"{questionaire_id}#{question_id}"
    table    = dynamodb.Table(_VENDOR_ANSWERS_TABLE)

    try:
        resp = table.get_item(
            Key={"vendor_id": vendor_id, "sort_key": sort_key}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB get failed: {e}")

    item = resp.get("Item")
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"No answer found for vendor '{vendor_id}', questionnaire '{questionaire_id}', question '{question_id}'"
        )

    return {
        "vendor_id":       vendor_id,
        "questionaire_id": questionaire_id,
        "question_id":     question_id,
        "question_text":   item.get("question_text", ""),
        "answer_value":    item.get("answer_value", ""),
        "human_value":     item.get("human_value", None),
        "answer_state":    item.get("answer_state", ""),
        "confidence":      float(item.get("confidence", 0.0)),
        "citations":       item.get("citations", []),
        "rationale":       item.get("rationale", ""),
        "suggestion":      item.get("suggestion", ""),
        "updated_at":      item.get("updated_at", ""),
    }


# ── Human submit endpoint ────────────────────────────────────────────────────────

class SubmitAnswerItem(BaseModel):
    question_id:  str
    human_value:  str

class SubmitAnswersRequest(BaseModel):
    questionaire_id: str
    answers:         list[SubmitAnswerItem]


@app.post("/api/vendors/{vendor_id}/submit-answers")
def submit_answers(vendor_id: str, req: SubmitAnswersRequest):
    """
    Save human-reviewed values to vendor_answers.
    Writes human_value and human_review_status = HUMAN_REVIEW_COMPLETED.
    answer_state (the AI reviewer verdict) is intentionally preserved so the
    AI Review panel continues to display correct verdicts in read-only mode.
    Only updates rows that already have an AI-generated entry (skips unanswered questions).
    """
    table   = dynamodb.Table(_VENDOR_ANSWERS_TABLE)
    updated = []

    for item in req.answers:
        sort_key = f"{req.questionaire_id}#{item.question_id}"

        try:
            resp = table.get_item(Key={"vendor_id": vendor_id, "sort_key": sort_key})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DynamoDB get failed for {sort_key}: {e}")

        existing = resp.get("Item")
        if not existing:
            continue  # AI review not yet run for this question — skip

        try:
            # answer_state is intentionally left unchanged — it holds the original AI verdict
            # (SUPPORTED / INSUFFICIENT_EVIDENCE / REVIEW_REQUIRED) so the AI panel
            # continues to show the correct reviewer decision in read-only mode.
            # ExpressionAttributeNames is used because "status" (suffix of human_review_status)
            # is a DynamoDB reserved word — substituting avoids expression parse errors.
            table.update_item(
                Key={"vendor_id": vendor_id, "sort_key": sort_key},
                UpdateExpression="SET human_value = :hv, #hrs = :hrs_val, updated_at = :t",
                ExpressionAttributeNames={"#hrs": "human_review_status"},
                ExpressionAttributeValues={
                    ":hv":      item.human_value,
                    ":hrs_val": "HUMAN_REVIEW_COMPLETED",
                    ":t":       datetime.now(timezone.utc).isoformat(),
                },
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DynamoDB update failed for {sort_key}: {e}")

        updated.append({
            "question_id":        item.question_id,
            "human_value":        item.human_value,
            "human_review_status": "HUMAN_REVIEW_COMPLETED",
        })

    return {
        "vendor_id":        vendor_id,
        "questionaire_id":  req.questionaire_id,
        "updated":          updated,
    }


# ── Bulk answers read endpoint ───────────────────────────────────────────────────

@app.get("/api/vendors/{vendor_id}/answers/{questionaire_id}")
def list_questionnaire_answers(vendor_id: str, questionaire_id: str):
    """Return all saved answers for a vendor + questionnaire (for read-only reload)."""
    table = dynamodb.Table(_VENDOR_ANSWERS_TABLE)
    try:
        resp = table.query(
            KeyConditionExpression=(
                boto3.dynamodb.conditions.Key("vendor_id").eq(vendor_id) &
                boto3.dynamodb.conditions.Key("sort_key").begins_with(f"{questionaire_id}#")
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB query failed: {e}")

    items = resp.get("Items", [])
    for item in items:
        if "confidence" in item:
            item["confidence"] = float(item["confidence"])
    return {"vendor_id": vendor_id, "questionaire_id": questionaire_id, "answers": items}


# ── Complete review endpoint ─────────────────────────────────────────────────────

@app.post("/api/vendors/{vendor_id}/complete-review")
def complete_review(vendor_id: str):
    """Lock the vendor review by setting status to HUMAN_REVIEW_COMPLETED."""
    try:
        vendor_resp = _vendor_table().query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("vendor_id").eq(vendor_id),
            ProjectionExpression="vendor_id, SOW_Key",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB query failed: {e}")

    items = vendor_resp.get("Items", [])
    if not items:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_id}' not found")

    sow_key = items[0]["SOW_Key"]
    try:
        _vendor_table().update_item(
            Key={"vendor_id": vendor_id, "SOW_Key": sow_key},
            UpdateExpression="SET review_status = :s",
            ExpressionAttributeValues={":s": "HUMAN_REVIEW_COMPLETED"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status update failed: {e}")

    return {"vendor_id": vendor_id, "review_status": "HUMAN_REVIEW_COMPLETED"}


# ── Questionnaire endpoints ─────────────────────────────────────────────────────

@app.get("/questionnaires")
def list_questionnaires():
    """Return all active questionnaires from questionaire_master."""
    table = _master_table()
    try:
        resp = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("active_ind").eq(True)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB scan failed: {e}")

    items = sorted(resp["Items"], key=lambda x: x["questionaire_id"])
    return {"questionnaires": items, "count": len(items)}


@app.get("/questionnaires/{questionnaire_id}")
def get_questionnaire(questionnaire_id: str):
    """Return a single questionnaire by ID."""
    table = _master_table()
    try:
        resp = table.get_item(Key={"questionaire_id": questionnaire_id})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB get failed: {e}")

    item = resp.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail=f"Questionnaire '{questionnaire_id}' not found")
    return item


@app.get("/questionnaires/{questionnaire_id}/questions")
def list_questions(questionnaire_id: str):
    """Return all active questions for a given questionnaire, ordered by question_id."""
    table = _questions_table()
    try:
        resp = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("questionaire_id").eq(questionnaire_id)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB query failed: {e}")

    all_items = resp["Items"]
    if not all_items:
        raise HTTPException(status_code=404, detail=f"No questions found for questionnaire '{questionnaire_id}'")
    items = sorted(
        [i for i in all_items if i.get("active_ind", True)],
        key=lambda x: x["question_id"]
    )
    return {"questionnaire_id": questionnaire_id, "questions": items, "count": len(items)}


@app.get("/questionnaires/{questionnaire_id}/questions/{question_id}")
def get_question(questionnaire_id: str, question_id: str):
    """Return a single question by questionnaire ID and question ID."""
    table = _questions_table()
    try:
        resp = table.get_item(
            Key={"questionaire_id": questionnaire_id, "question_id": question_id}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB get failed: {e}")

    item = resp.get("Item")
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"Question '{question_id}' not found in questionnaire '{questionnaire_id}'"
        )
    return item


# ── Questionnaire & Question Management (TPRM Edit Questions) ────────────────

class CreateQuestionnaireRequest(BaseModel):
    questionaire_id: str
    category: str
    description: str
    version: str = "1.0"


class CreateQuestionRequest(BaseModel):
    question_text: str
    question_type: str          # YES_NO | TEXT
    mandatory_ind: bool = True
    evidence_required: bool = False
    topic: str = ""


class UpdateQuestionRequest(BaseModel):
    question_text: str
    question_type: str
    mandatory_ind: bool
    evidence_required: bool
    topic: str


@app.post("/questionnaires")
def create_questionnaire(body: CreateQuestionnaireRequest):
    """Create a new questionnaire category in questionaire_master."""
    table = _master_table()
    existing = table.get_item(Key={"questionaire_id": body.questionaire_id}).get("Item")
    if existing:
        raise HTTPException(status_code=409, detail=f"Questionnaire '{body.questionaire_id}' already exists")
    item = {
        "questionaire_id": body.questionaire_id,
        "category": body.category,
        "description": body.description,
        "version": body.version,
        "active_ind": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        table.put_item(Item=item)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB put failed: {e}")
    return item


@app.delete("/questionnaires/{questionnaire_id}")
def delete_questionnaire(questionnaire_id: str):
    """Soft-delete a questionnaire category (sets active_ind=False)."""
    table = _master_table()
    try:
        table.update_item(
            Key={"questionaire_id": questionnaire_id},
            UpdateExpression="SET active_ind = :f",
            ExpressionAttributeValues={":f": False},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB update failed: {e}")
    return {"questionaire_id": questionnaire_id, "active_ind": False}


@app.post("/questionnaires/{questionnaire_id}/questions")
def create_question(questionnaire_id: str, body: CreateQuestionRequest):
    """Add a new question to a questionnaire. question_id is auto-incremented."""
    table = _questions_table()
    try:
        resp = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("questionaire_id").eq(questionnaire_id)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB query failed: {e}")

    existing_ids = [item["question_id"] for item in resp.get("Items", [])]
    nums = []
    for qid in existing_ids:
        try:
            nums.append(int(qid[1:]))
        except (ValueError, IndexError):
            pass
    next_num = max(nums) + 1 if nums else 1
    question_id = f"Q{next_num:03d}"

    allowed_answers = ["Yes", "No"] if body.question_type == "YES_NO" else []
    item = {
        "questionaire_id": questionnaire_id,
        "question_id": question_id,
        "question_text": body.question_text,
        "question_type": body.question_type,
        "mandatory_ind": body.mandatory_ind,
        "evidence_required": body.evidence_required,
        "topic": body.topic,
        "allowed_answers": allowed_answers,
        "active_ind": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        table.put_item(Item=item)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB put failed: {e}")
    return item


@app.put("/questionnaires/{questionnaire_id}/questions/{question_id}")
def update_question(questionnaire_id: str, question_id: str, body: UpdateQuestionRequest):
    """Update all editable fields of a question."""
    table = _questions_table()
    allowed_answers = ["Yes", "No"] if body.question_type == "YES_NO" else []
    try:
        table.update_item(
            Key={"questionaire_id": questionnaire_id, "question_id": question_id},
            UpdateExpression=(
                "SET question_text = :qt, question_type = :qtype, "
                "mandatory_ind = :mi, evidence_required = :er, "
                "topic = :t, allowed_answers = :aa"
            ),
            ExpressionAttributeValues={
                ":qt": body.question_text,
                ":qtype": body.question_type,
                ":mi": body.mandatory_ind,
                ":er": body.evidence_required,
                ":t": body.topic,
                ":aa": allowed_answers,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB update failed: {e}")
    return {"questionaire_id": questionnaire_id, "question_id": question_id, "updated": True}


@app.delete("/questionnaires/{questionnaire_id}/questions/{question_id}")
def delete_question(questionnaire_id: str, question_id: str):
    """Soft-delete a question (sets active_ind=False)."""
    table = _questions_table()
    try:
        table.update_item(
            Key={"questionaire_id": questionnaire_id, "question_id": question_id},
            UpdateExpression="SET active_ind = :f",
            ExpressionAttributeValues={":f": False},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB update failed: {e}")
    return {"questionaire_id": questionnaire_id, "question_id": question_id, "active_ind": False}
