import json

def handler(request):
    # Handle CORS preflight
    if request["method"] == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
            "body": ""
        }

    # Mock dashboard stats
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        "body": json.dumps({
            "total_customers": 2,
            "total_bills": 5,
            "total_tailors": 3,
            "total_jobs": 4,
            "pending_jobs": 1,
            "today_bills": 2,
            "total_revenue": 1200
        })
    }
