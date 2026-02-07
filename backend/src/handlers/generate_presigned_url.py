import boto3
import json
import os
import logging
import uuid
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.metrics import MetricUnit

# Initialize AWS Lambda Powertools
logger = Logger()
tracer = Tracer()
metrics = Metrics()

# Initialize boto3 client
s3_client = boto3.client('s3')

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event, context):
    """
    Generate presigned URL for secure file upload to S3
    
    Expected input:
    {
        "body": "{\"filename\": \"my-art.jpg\"}"
    }
    
    Returns:
    {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        "body": "{\"uploadUrl\": \"...\", \"objectKey\": \"...\"}"
    }
    """
    
    # CORS headers for all responses
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    }
    
    try:
        # Get environment variables
        ingestion_bucket = os.environ.get('INGESTION_BUCKET')
        if not ingestion_bucket:
            logger.error("INGESTION_BUCKET environment variable not set")
            return {
                "statusCode": 500,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Internal server configuration error",
                    "message": "Storage bucket not configured"
                })
            }
        
        # Handle CORS preflight requests
        if event.get('httpMethod') == 'OPTIONS':
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": ""
            }
        
        # Parse request body
        if not event.get('body'):
            logger.warning("Empty request body received")
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Bad Request",
                    "message": "Request body is required"
                })
            }
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON in request body: {str(e)}")
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Bad Request",
                    "message": "Invalid JSON format"
                })
            }
        
        # Validate filename
        filename = body.get('filename')
        if not filename or not filename.strip():
            logger.warning("Missing or empty filename in request")
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Bad Request",
                    "message": "Filename is required and cannot be empty"
                })
            }
        
        # Sanitize filename and validate file extension
        filename = filename.strip()
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']
        file_extension = os.path.splitext(filename.lower())[1]
        
        if file_extension not in allowed_extensions:
            logger.warning(f"Unsupported file extension: {file_extension}")
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Bad Request",
                    "message": f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
                })
            }
        
        # Generate unique object key to prevent collisions
        # Pattern: uploads/{uuid4()}/{original_filename}
        unique_id = str(uuid.uuid4())
        object_key = f"uploads/{unique_id}/{filename}"
        
        logger.info(f"Generating presigned URL for object: {object_key}")
        
        # Generate presigned URL for PUT operation
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': ingestion_bucket,
                'Key': object_key,
                'ContentType': f'image/{file_extension[1:]}' if file_extension != '.jpg' else 'image/jpeg'
            },
            ExpiresIn=600,  # 10 minutes
            HttpMethod='PUT'
        )
        
        # Log success metrics
        metrics.add_metric(name="PresignedUrlGenerated", unit=MetricUnit.Count, value=1)
        
        logger.info(f"Successfully generated presigned URL for {filename}")
        
        response_body = {
            "uploadUrl": presigned_url,
            "objectKey": object_key,
            "expiresIn": 600,
            "filename": filename,
            "assetId": unique_id
        }
        
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps(response_body)
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        logger.error(f"AWS ClientError: {error_code} - {error_message}")
        metrics.add_metric(name="PresignedUrlError", unit=MetricUnit.Count, value=1)
        
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({
                "error": "Internal Server Error",
                "message": "Failed to generate upload URL",
                "code": error_code
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        metrics.add_metric(name="PresignedUrlError", unit=MetricUnit.Count, value=1)
        
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({
                "error": "Internal Server Error",
                "message": "An unexpected error occurred"
            })
        }