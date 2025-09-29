import json

def handler(request):
    # Handle CORS preflight
    if request["method"] == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT",
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
                "business_name": "STAR TAILORS",
                "address": "123 Main Street",
                "phone": "9999999999",
                "email": "info@startailors.com"
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
                "message": "Business updated successfully",
                **body
            })
        }
