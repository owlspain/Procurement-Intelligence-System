import boto3

session  = boto3.Session(profile_name="rfp-infra")
dynamodb = session.client("dynamodb", region_name="us-east-1")

table_name = "vendor_answers"

resp = dynamodb.create_table(
    TableName=table_name,
    KeySchema=[
        {"AttributeName": "vendor_id", "KeyType": "HASH"},
        {"AttributeName": "sort_key",  "KeyType": "RANGE"},
    ],
    AttributeDefinitions=[
        {"AttributeName": "vendor_id", "AttributeType": "S"},
        {"AttributeName": "sort_key",  "AttributeType": "S"},
    ],
    BillingMode="PAY_PER_REQUEST",
)

waiter = dynamodb.get_waiter("table_exists")
waiter.wait(TableName=table_name)

print(f"Table '{table_name}' created successfully.")
print(f"Status: {resp['TableDescription']['TableStatus']}")
print(f"Sort key format example: ARCHITECTURE#Q001")
