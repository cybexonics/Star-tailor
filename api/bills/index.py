import json, uuid

def handler(request):
    if request["method"] == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": ""
        }

    if request["method"] == "GET":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"bills": []})
        }

    if request["method"] == "POST":
        bill_id = str(uuid.uuid4())
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"message": "Bill created", "_id": bill_id})
        }

    return {"statusCode": 405, "body": "Method Not Allowed"}
