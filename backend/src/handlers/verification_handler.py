import boto3
import json
import os
import logging
import io
from PIL import Image
import imagehash
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit

# Initialize AWS Lambda Powertools
logger = Logger()
tracer = Tracer()
metrics = Metrics()

# Initialize boto3 clients
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event, context):
    """
    Verify authenticity of an uploaded image by checking against the ledger
    
    Expected input:
    {
        "body": "{\"imageData\": \"base64-encoded-image\"}"
    }
    
    OR via S3:
    {
        "body": "{\"s3Bucket\": \"bucket\", \"s3Key\": \"key\"}"
    }
    
    Returns:
    {
        "statusCode": 200,
        "body": "{
            \"isAuthentic\": true/false,
            \"confidence\": 0.95,
            \"assetId\": \"uuid\",
            \"registrationDate\": \"2024-01-15T10:30:00Z\",
            \"details\": {...}
        }"
    }
    """
    
    # CORS headers
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    }
    
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": ""
            }
        
        # Parse request body
        if not event.get('body'):
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
        except json.JSONDecodeError:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Bad Request",
                    "message": "Invalid JSON format"
                })
            }
        
        # Get DynamoDB table
        table_name = os.environ.get('DYNAMODB_TABLE', 'hatchmark-assets')
        table = dynamodb.Table(table_name)
        
        # Load image from different sources
        image = None
        image_source = "unknown"
        
        if 'imageData' in body:
            # Base64 encoded image
            import base64
            try:
                image_data = base64.b64decode(body['imageData'])
                image = Image.open(io.BytesIO(image_data))
                image_source = "base64"
            except Exception as e:
                logger.error(f"Failed to decode base64 image: {str(e)}")
                return {
                    "statusCode": 400,
                    "headers": cors_headers,
                    "body": json.dumps({
                        "error": "Bad Request",
                        "message": "Invalid base64 image data"
                    })
                }
        
        elif 's3Bucket' in body and 's3Key' in body:
            # S3 object
            try:
                response = s3_client.get_object(Bucket=body['s3Bucket'], Key=body['s3Key'])
                image_data = response['Body'].read()
                image = Image.open(io.BytesIO(image_data))
                image_source = f"s3://{body['s3Bucket']}/{body['s3Key']}"
            except Exception as e:
                logger.error(f"Failed to load S3 image: {str(e)}")
                return {
                    "statusCode": 400,
                    "headers": cors_headers,
                    "body": json.dumps({
                        "error": "Bad Request",
                        "message": "Failed to load image from S3"
                    })
                }
        
        else:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Bad Request",
                    "message": "Either imageData (base64) or s3Bucket+s3Key must be provided"
                })
            }
        
        if not image:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Bad Request",
                    "message": "Failed to load image"
                })
            }
        
        logger.info(f"Processing verification for image from: {image_source}")
        
        # Convert to RGB for consistent hashing
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Compute perceptual hash
        query_hash = str(imagehash.phash(image, hash_size=16))
        logger.info(f"Computed hash for verification: {query_hash}")
        
        # Search for exact match first
        try:
            response = table.query(
                IndexName='PerceptualHashIndex',
                KeyConditionExpression='perceptualHash = :hash',
                ExpressionAttributeValues={':hash': query_hash}
            )
            
            if response['Items']:
                # Exact match found
                asset = response['Items'][0]
                logger.info(f"Exact match found: {asset['assetId']}")
                
                metrics.add_metric(name="VerificationExactMatch", unit=MetricUnit.Count, value=1)
                
                return {
                    "statusCode": 200,
                    "headers": cors_headers,
                    "body": json.dumps({
                        "isAuthentic": True,
                        "confidence": 1.0,
                        "matchType": "exact",
                        "assetId": asset['assetId'],
                        "registrationDate": asset['timestamp'],
                        "originalFilename": asset.get('originalFilename', 'unknown'),
                        "details": {
                            "hashMatch": query_hash,
                            "status": asset.get('status', 'unknown'),
                            "imageMetadata": asset.get('metadata', {})
                        }
                    })
                }
            
        except ClientError as e:
            logger.error(f"Error querying DynamoDB: {str(e)}")
            metrics.add_metric(name="VerificationError", unit=MetricUnit.Count, value=1)
            return {
                "statusCode": 500,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Internal Server Error",
                    "message": "Failed to verify image"
                })
            }
        
        # No exact match found - check for similar images
        logger.info("No exact match found, checking for similar images")
        
        # Scan for similar hashes (this is expensive but needed for fuzzy matching)
        # In production, you'd want to optimize this with better indexing strategies
        try:
            response = table.scan()
            similar_assets = []
            
            query_hash_int = int(query_hash, 16)
            
            for item in response['Items']:
                stored_hash = item['perceptualHash']
                stored_hash_int = int(stored_hash, 16)
                
                # Calculate Hamming distance
                hamming_distance = bin(query_hash_int ^ stored_hash_int).count('1')
                similarity = 1.0 - (hamming_distance / 256.0)  # 256 bits total
                
                if similarity > 0.85:  # 85% similarity threshold
                    similar_assets.append({
                        "asset": item,
                        "similarity": similarity,
                        "hammingDistance": hamming_distance
                    })
            
            if similar_assets:
                # Sort by similarity
                similar_assets.sort(key=lambda x: x['similarity'], reverse=True)
                best_match = similar_assets[0]
                
                logger.info(f"Similar match found: {best_match['asset']['assetId']} with {best_match['similarity']:.2f} similarity")
                
                metrics.add_metric(name="VerificationSimilarMatch", unit=MetricUnit.Count, value=1)
                
                return {
                    "statusCode": 200,
                    "headers": cors_headers,
                    "body": json.dumps({
                        "isAuthentic": True,
                        "confidence": best_match['similarity'],
                        "matchType": "similar",
                        "assetId": best_match['asset']['assetId'],
                        "registrationDate": best_match['asset']['timestamp'],
                        "originalFilename": best_match['asset'].get('originalFilename', 'unknown'),
                        "details": {
                            "queryHash": query_hash,
                            "matchedHash": best_match['asset']['perceptualHash'],
                            "hammingDistance": best_match['hammingDistance'],
                            "similarity": best_match['similarity'],
                            "status": best_match['asset'].get('status', 'unknown')
                        }
                    })
                }
            
        except Exception as e:
            logger.error(f"Error during similarity search: {str(e)}")
            # Continue to return "not authentic" rather than error
        
        # No match found
        logger.info("No matching asset found in ledger")
        metrics.add_metric(name="VerificationNoMatch", unit=MetricUnit.Count, value=1)
        
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "isAuthentic": False,
                "confidence": 0.0,
                "matchType": "none",
                "message": "No matching asset found in authenticity ledger",
                "details": {
                    "queryHash": query_hash,
                    "searchedAssets": response.get('Count', 0) if 'response' in locals() else 0
                }
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in verification: {str(e)}")
        metrics.add_metric(name="VerificationUnexpectedError", unit=MetricUnit.Count, value=1)
        
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({
                "error": "Internal Server Error",
                "message": "An unexpected error occurred during verification"
            })
        }