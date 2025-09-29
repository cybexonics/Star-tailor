import json

def handler(request):
    # Handle CORS preflight
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
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({
                "upi_id": "startailors@upi",
                "business_name": "STAR TAILORS"
            })
        }

    if request["method"] == "PUT":
        body = json.loads(request.get("body", "{}"))
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({
                "message": "UPI updated successfully",
                "upi_id": body.get("upi_id", ""),
                "business_name": body.get("business_name", "")
            })
        }
