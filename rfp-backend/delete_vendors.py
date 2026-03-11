import boto3

KEEP_VENDOR_ID = "V07092485"

session  = boto3.Session(profile_name="rfp-infra")
dynamodb = session.resource("dynamodb", region_name="us-east-1")
table    = dynamodb.Table("vendor_uploads")

# Scan all vendors — fetch both PK and SK
resp  = table.scan(ProjectionExpression="vendor_id, SOW_Key")
items = resp["Items"]

while "LastEvaluatedKey" in resp:
    resp  = table.scan(
        ProjectionExpression="vendor_id, SOW_Key",
        ExclusiveStartKey=resp["LastEvaluatedKey"]
    )
    items.extend(resp["Items"])

to_delete = [item for item in items if item["vendor_id"] != KEEP_VENDOR_ID]

print(f"Total vendors found : {len(items)}")
print(f"Keeping             : {KEEP_VENDOR_ID}")
print(f"To be deleted       : {len(to_delete)}")

for item in to_delete:
    table.delete_item(Key={"vendor_id": item["vendor_id"], "SOW_Key": item["SOW_Key"]})
    print(f"  Deleted: {item['vendor_id']} / {item['SOW_Key']}")

print("Done.")
