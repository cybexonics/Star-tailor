import json
import uuid

def handler(request):
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

    if request["method"] == "GET":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"tailors": []})
        }

    if request["method"] == "POST":
        tailor_id = str(uuid.uuid4())
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({
                "message": "Tailor created successfully",
                "_id": tailor_id,
                "tailor_id": tailor_id
            })
        }

    if request["method"] == "PUT":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"message": "Tailor updated successfully"})
        }

    if request["method"] == "DELETE":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"message": "Tailor deleted successfully"})
        }

    return {
        "statusCode": 405,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"error": "Method not allowed"})
    }
