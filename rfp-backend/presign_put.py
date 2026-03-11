import boto3
from botocore.config import Config

BUCKET = "rfp-tprm-agent"
KEY = "uploads/test-upload.pdf"
CONTENT_TYPE = "application/pdf"
EXPIRY = 300

s3_client = boto3.client(
    "s3",
    config=Config(signature_version="s3v4"),
)

presigned_url = s3_client.generate_presigned_url(
    ClientMethod="put_object",
    Params={
        "Bucket": BUCKET,
        "Key": KEY,
        "ContentType": CONTENT_TYPE,
    },
    ExpiresIn=EXPIRY,
)

print(f"Key:          {KEY}")
print(f"Presigned URL:\n{presigned_url}")
