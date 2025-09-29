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
            "body": json.dumps({"jobs": []})
        }

    if request["method"] == "POST":
        job_id = str(uuid.uuid4())
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({
                "message": "Job created successfully",
                "_id": job_id,
                "job_id": job_id
            })
        }

    return {
        "statusCode": 405,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"error": "Method not allowed"})
    }
