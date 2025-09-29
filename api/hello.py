import json

def handler(request):
    body = json.dumps({"message": "Hello from Python on Vercel!"})
    return {
        "statusCode": 200,
        "headers": { "Content-Type": "application/json" },
        "body": body
    }
