import json
import uuid

def handler(request):
    # ✅ Handle CORS preflight
    if request["method"] == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": ""
        }

    # ✅ GET all customers
    if request["method"] == "GET":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"customers": []})
        }

    # ✅ CREATE a customer
    if request["method"] == "POST":
        customer_id = str(uuid.uuid4())
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({
                "message": "Customer created successfully",
                "_id": customer_id,
                "customer_id": customer_id
            })
        }

    # ✅ UPDATE customer
    if request["method"] == "PUT":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"message": "Customer updated successfully"})
        }

    # ✅ DELETE customer
    if request["method"] == "DELETE":
        return {
            "statusCode": 200
