import json

def handler(request):
    # Handle preflight (CORS check)
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

    # Return mock dashboard stats
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps({
            "total_customers": 0,
            "total_bills": 0,
            "total_tailors": 0,
            "total_jobs": 0,
            "pending_jobs": 0,
            "today_bills": 0,
            "total_revenue": 0
        })
    }
