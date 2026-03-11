import boto3
from botocore.exceptions import ClientError, WaiterError

TABLE_NAME = "questionaire_master"
PROFILE_NAME = "rfp-infra"
REGION_NAME = "us-east-1"

# Key schema:
#   questionaire_id -> partition key (HASH)
#
# Regular attributes (no pre-declaration needed in DynamoDB):
#   category, description, version, active_ind, created_dt


def create_questionaire_master_table():
    session = boto3.Session(profile_name=PROFILE_NAME, region_name=REGION_NAME)
    client = session.client("dynamodb")

    # Check if table already exists
    try:
        client.describe_table(TableName=TABLE_NAME)
        print(f"Table '{TABLE_NAME}' already exists.")
        return
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            print(f"Error checking table: {e.response['Error']['Message']}")
            raise

    # Create the table
    print(f"Creating table '{TABLE_NAME}'...")
    try:
        client.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {"AttributeName": "questionaire_id", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "questionaire_id", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
    except ClientError as e:
        print(f"Failed to initiate table creation: {e.response['Error']['Message']}")
        return

    # Wait until the table is active
    try:
        waiter = client.get_waiter("table_exists")
        waiter.wait(
            TableName=TABLE_NAME,
            WaiterConfig={"Delay": 5, "MaxAttempts": 24},  # waits up to 2 minutes
        )
        print(f"Table '{TABLE_NAME}' created successfully.")
    except WaiterError as e:
        print(f"Table creation timed out or failed: {e}")
    except ClientError as e:
        print(f"Error while waiting for table: {e.response['Error']['Message']}")


if __name__ == "__main__":
    create_questionaire_master_table()
