# CLAUDE.md — Contract Intelligence Assistant (Demo Build)

## Stack
- Frontend: React
- Backend/API: Node.js
- Automation/Scripts: Python (boto3)
- Database: DynamoDB
- Storage: S3

## Product Flow (must preserve)
1) RM uploads/selects vendor documents
2) System drafts answers to TPRM questionnaire
3) Draft ALWAYS goes to human review (RM edits/approves)
4) Export/download final output

## Non-negotiables (Hard Constraints)
- Never write vendor documents to local disk.
- All document uploads must use **S3 presigned URLs**.
- DynamoDB is accessed via **Python boto3 scripts** (do NOT introduce Node AWS SDK during demo phase).
- Use AWS credentials from local AWS config (aws configure) OR a named profile when specified.
- Keep buckets private; no public S3 objects.
- AI outputs are **draft-only**; enforce **human review** before “final”.

## AWS Credential Rules (important)
- Prefer using a named AWS profile: **rfp-infra** if available.
- Do not hardcode AWS keys in code or commit them.
- If credentials are needed in runtime code, use environment variables or shared AWS credentials file only.

## Demo-week Working Style
- Prefer small, incremental changes over refactors.
- Don’t invent new architecture or services unless asked.
- When implementing a feature: list files you’ll change, then implement.

##Profile used
- │  Client   │  Profile  │                    Used for                    │
  ├───────────┼───────────┼────────────────────────────────────────────────┤                              
  │ s3_client │ default   │ Presigned URL uploads (SOW/MSA) + JSONL writes │                              
  ├───────────┼───────────┼────────────────────────────────────────────────┤
  │ _rfp_s3   │ rfp-infra │ Reading SOW/MSA objects from S3