import boto3
from datetime import datetime, timezone

# ── AWS connection ──────────────────────────────────────────────────────────────
session = boto3.Session(profile_name="rfp-infra")
dynamodb = session.resource("dynamodb", region_name="us-east-1")

MASTER_TABLE = "questionaire_master"
QUESTIONS_TABLE = "Questionaire_questions"

NOW = datetime.now(timezone.utc).isoformat()

# ── Questionnaire master records ────────────────────────────────────────────────
QUESTIONNAIRES = [
    {
        "questionaire_id": "DATA_PRIVACY",
        "category": "Privacy",
        "description": "Data privacy and handling controls",
        "version": "v1",
        "active_ind": True,
        "created_at": NOW,
    },
    {
        "questionaire_id": "SECURITY_CONTROLS",
        "category": "Security",
        "description": "Security controls and incident handling",
        "version": "v1",
        "active_ind": True,
        "created_at": NOW,
    },
    {
        "questionaire_id": "ARCHITECTURE",
        "category": "Architecture",
        "description": "Hosting and data architecture",
        "version": "v1",
        "active_ind": True,
        "created_at": NOW,
    },
]

# ── Question records ────────────────────────────────────────────────────────────
YES_NO = ["YES", "NO"]


def q(questionnaire_id, question_id, question_text, question_type, topic):
    item = {
        "questionaire_id": questionnaire_id,
        "question_id": question_id,
        "question_text": question_text,
        "question_type": question_type,
        "mandatory_ind": True,
        "evidence_required": True,
        "topic": topic,
        "created_at": NOW,
    }
    if question_type == "YES_NO":
        item["allowed_answers"] = YES_NO
    # TEXT questions omit allowed_answers entirely
    return item


QUESTIONS = [
    # DATA_PRIVACY ──────────────────────────────────────────────────────────────
    q("DATA_PRIVACY", "Q001", "Does the vendor process customer personal data as part of the service?", "YES_NO", "privacy"),
    q("DATA_PRIVACY", "Q002", "Is customer data encrypted at rest?", "YES_NO", "privacy"),
    q("DATA_PRIVACY", "Q003", "Is customer data encrypted in transit using TLS 1.2 or higher?", "YES_NO", "privacy"),
    q("DATA_PRIVACY", "Q004", "Does the vendor share customer data with any third parties or subprocessors?", "YES_NO", "privacy"),
    q("DATA_PRIVACY", "Q005", "Describe the data retention policy for customer data.", "TEXT", "privacy"),

    # SECURITY_CONTROLS ─────────────────────────────────────────────────────────
    q("SECURITY_CONTROLS", "Q001", "Is role-based access control (RBAC) implemented for system access?", "YES_NO", "security"),
    q("SECURITY_CONTROLS", "Q002", "Are administrative actions logged and auditable?", "YES_NO", "security"),
    q("SECURITY_CONTROLS", "Q003", "Are security incidents reported to customers within a defined timeframe?", "YES_NO", "security"),
    q("SECURITY_CONTROLS", "Q004", "Is multi-factor authentication required for privileged users?", "YES_NO", "security"),
    q("SECURITY_CONTROLS", "Q005", "What is the defined incident response time SLA?", "TEXT", "security"),

    # ARCHITECTURE ──────────────────────────────────────────────────────────────
    q("ARCHITECTURE", "Q001", "Is customer data stored only within the organization's internal network?", "YES_NO", "architecture"),
    q("ARCHITECTURE", "Q002", "Does the service rely on third-party cloud or hosting providers?", "YES_NO", "architecture"),
    q("ARCHITECTURE", "Q003", "Is customer data logically isolated between tenants?", "YES_NO", "architecture"),
    q("ARCHITECTURE", "Q004", "Are backups maintained for disaster recovery?", "YES_NO", "architecture"),
    q("ARCHITECTURE", "Q005", "Describe the hosting architecture of the platform.", "TEXT", "architecture"),
]


# ── Seed functions ──────────────────────────────────────────────────────────────
def seed_master():
    table = dynamodb.Table(MASTER_TABLE)
    for record in QUESTIONNAIRES:
        table.put_item(Item=record)
    print(f"Seeded {len(QUESTIONNAIRES)} questionnaires")


def seed_questions():
    table = dynamodb.Table(QUESTIONS_TABLE)
    for record in QUESTIONS:
        table.put_item(Item=record)
    print(f"Seeded {len(QUESTIONS)} questions")


# ── Entry point ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    seed_master()
    seed_questions()
