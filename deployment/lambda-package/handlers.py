import json
import boto3
import os
import uuid
import io
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
from PIL import Image
import imagehash

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
stepfunctions = boto3.client('stepfunctions')
sqs = boto3.client('sqs')

def generate_presigned_url(event, context):
    """
    Lambda function to generate a presigned URL for S3 upload.
    This handles the /generate-upload-url API endpoint.
    """
    try:
        # Parse the request body
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename')
        
        if not filename:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'filename is required'})
            }
        
        # Get S3 bucket from environment variable
        bucket_name = os.environ.get('S3_BUCKET')
        if not bucket_name:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'S3 bucket not configured'})
            }
        
        # Generate unique key for the upload
        unique_id = str(uuid.uuid4())
        file_extension = filename.split('.')[-1] if '.' in filename else ''
        s3_key = f"uploads/{unique_id}.{file_extension}" if file_extension else f"uploads/{unique_id}"
        
        # Generate presigned URL for PUT operation (15 minutes expiry)
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': s3_key,
                'ContentType': 'image/*'
            },
            ExpiresIn=900  # 15 minutes
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                's3Key': s3_key,
                'originalFilename': filename
            })
        }
        
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }


def compute_phash(event, context):
    """
    Lambda function to compute perceptual hash of uploaded image.
    Triggered by S3 upload event.
    """
    try:
        # Parse S3 event
        s3_event = event['Records'][0]['s3']
        bucket_name = s3_event['bucket']['name']
        object_key = s3_event['object']['key']
        
        print(f"Processing image: {object_key} from bucket: {bucket_name}")
        
        # Download image from S3
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        image_data = response['Body'].read()
        
        # Compute perceptual hash using ImageHash
        image = Image.open(io.BytesIO(image_data))
        perceptual_hash = str(imagehash.phash(image))
        
        print(f"Computed perceptual hash: {perceptual_hash}")
        
        return {
            'statusCode': 200,
            'body': {
                'bucketName': bucket_name,
                'objectKey': object_key,
                'perceptualHash': perceptual_hash,
                'timestamp': datetime.utcnow().isoformat(),
                'imageSize': len(image_data)
            }
        }
        
    except Exception as e:
        print(f"Error computing phash: {str(e)}")
        raise e


def write_to_ledger(event, context):
    """
    Lambda function to write registration data to DynamoDB.
    """
    try:
        # Get data from the previous step (compute_phash)
        input_data = event
        
        bucket_name = input_data.get('bucketName')
        object_key = input_data.get('objectKey')
        perceptual_hash = input_data.get('perceptualHash')
        timestamp = input_data.get('timestamp')
        image_size = input_data.get('imageSize', 0)
        
        # Generate asset ID
        asset_id = str(uuid.uuid4())
        
        print(f"Writing to DynamoDB ledger: {object_key}, hash: {perceptual_hash}")
        
        # Get DynamoDB table
        table_name = os.environ.get('DYNAMODB_TABLE', 'hatchmark-assets')
        table = dynamodb.Table(table_name)
        
        # Write to DynamoDB
        item = {
            'assetId': asset_id,
            'perceptualHash': perceptual_hash,
            'objectKey': object_key,
            'bucketName': bucket_name,
            'timestamp': timestamp,
            'status': 'REGISTERED',
            'imageSize': image_size,
            'createdAt': datetime.utcnow().isoformat(),
            'TTL': int((datetime.utcnow() + timedelta(days=365*10)).timestamp())  # 10 year retention
        }
        
        table.put_item(Item=item)
        
        # Send watermarking task to SQS queue
        queue_url = os.environ.get('SQS_QUEUE_URL')
        if queue_url:
            sqs.send_message(
                QueueUrl=queue_url,
                MessageBody=json.dumps({
                    'assetId': asset_id,
                    'objectKey': object_key,
                    'bucketName': bucket_name,
                    'perceptualHash': perceptual_hash,
                    'timestamp': timestamp
                })
            )
            print(f"Sent watermarking task to SQS for asset: {asset_id}")
        
        return {
            'statusCode': 200,
            'body': {
                'assetId': asset_id,
                'bucketName': bucket_name,
                'objectKey': object_key,
                'perceptualHash': perceptual_hash,
                'timestamp': timestamp,
                'status': 'REGISTERED'
            }
        }
        
    except Exception as e:
        print(f"Error writing to ledger: {str(e)}")
        raise e


def verify_artwork(event, context):
    """
    Lambda function to verify artwork authenticity.
    This handles the /verify-artwork API endpoint.
    """
    try:
        # Handle CORS preflight requests
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': ''
            }
        
        # Parse multipart form data for file upload
        content_type = event.get('headers', {}).get('content-type', '')
        
        if 'multipart/form-data' in content_type:
            # Extract uploaded file from multipart data
            # This is a simplified implementation - in production use proper multipart parser
            body = event.get('body', '')
            if event.get('isBase64Encoded'):
                import base64
                body = base64.b64decode(body)
            
            # For now, we'll need to implement proper multipart parsing
            # or use a library like python-multipart
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Multipart parsing not yet implemented'})
            }
        
        # Handle JSON verification (by hash or asset ID)
        body = json.loads(event.get('body', '{}'))
        
        if 'perceptualHash' in body:
            perceptual_hash = body['perceptualHash']
            
            # Query DynamoDB for matching hash
            table_name = os.environ.get('DYNAMODB_TABLE', 'hatchmark-assets')
            table = dynamodb.Table(table_name)
            
            # Query by perceptual hash (requires GSI)
            response = table.scan(
                FilterExpression='perceptualHash = :hash',
                ExpressionAttributeValues={':hash': perceptual_hash}
            )
            
            if response['Items']:
                asset = response['Items'][0]
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'verdict': 'VERIFIED',
                        'assetId': asset['assetId'],
                        'registrationTime': asset['timestamp'],
                        'confidence': 'HIGH',
                        'message': 'Image found in authenticity registry'
                    })
                }
            else:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'verdict': 'NOT_REGISTERED',
                        'confidence': 'HIGH',
                        'message': 'Image not found in authenticity registry'
                    })
                }
        
        elif 'assetId' in body:
            asset_id = body['assetId']
            
            # Query DynamoDB by asset ID
            table_name = os.environ.get('DYNAMODB_TABLE', 'hatchmark-assets')
            table = dynamodb.Table(table_name)
            
            try:
                response = table.get_item(Key={'assetId': asset_id})
                if 'Item' in response:
                    asset = response['Item']
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'verdict': 'VERIFIED',
                            'assetId': asset['assetId'],
                            'registrationTime': asset['timestamp'],
                            'perceptualHash': asset['perceptualHash'],
                            'confidence': 'HIGH',
                            'message': 'Asset verified in registry'
                        })
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'verdict': 'NOT_FOUND',
                            'message': 'Asset ID not found in registry'
                        })
                    }
            except ClientError as e:
                print(f"DynamoDB error: {e}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Database error'})
                }
        
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'perceptualHash or assetId required'})
            }
        
    except Exception as e:
        print(f"Error in verification: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
