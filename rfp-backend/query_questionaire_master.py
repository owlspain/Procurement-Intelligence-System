import boto3
from pprint import pprint

session  = boto3.Session(profile_name="rfp-infra")
dynamodb = session.resource("dynamodb", region_name="us-east-1")
table    = dynamodb.Table("questionaire_master")

resp  = table.scan(ProjectionExpression="questionaire_id")
items = sorted(resp["Items"], key=lambda x: x["questionaire_id"])

print(f"Total records: {len(items)}\n")
for item in items:
    print(item["questionaire_id"])
