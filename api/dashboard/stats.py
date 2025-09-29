import json

def handler(request):
    # Later you can add real logic (DB queries, etc.)
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",   # ✅ lets frontend call this
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps({
            "status": "ok",
            "message": "Dashboard stats working!"
        })
    }
