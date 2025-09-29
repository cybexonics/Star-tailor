import json
import uuid  # to generate unique customer IDs

def handler(request):
    # In the future, parse request body and save to DB
    # For now, just generate a fake ID
    customer_id = str(uuid.uuid4())

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps({
            "message": "Customer created successfully",
            "customer_id": customer_id
        })
    }
