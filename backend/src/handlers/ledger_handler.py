import boto3
import json
import os
import logging
from datetime import datetime, timezone
import uuid
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit

# Initialize AWS Lambda Powertools
logger = Logger()
tracer = Tracer()
metrics = Metrics()

# Initialize boto3 client
dynamodb = boto3.resource('dynamodb')

@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event, context):
    """
    Record asset information to DynamoDB ledger
    
    Input: Hash computation result from previous step
    {
        "perceptualHash": "a78fd4e2c1b89e3f",
        "objectKey": "uploads/uuid/filename.jpg",
        "bucket": "bucket-name",
        "imageMetadata": {...}
    }
    
    Returns:
    {
        "assetId": "uuid-v4-string",
        "perceptualHash": "a78fd4e2c1b89e3f",
        "status": "REGISTERED",
        "timestamp": "2024-01-15T10:30:00Z"
    }
    """
    
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get table name from environment
        table_name = os.environ.get('DYNAMODB_TABLE', 'hatchmark-assets')
        table = dynamodb.Table(table_name)
        
        # Extract required data from event
        perceptual_hash = event.get('perceptualHash')
        object_key = event.get('objectKey')
        bucket_name = event.get('bucket')
        image_metadata = event.get('imageMetadata', {})
        additional_hashes = event.get('additionalHashes', {})
        
        if not perceptual_hash or not object_key:
            logger.error("Missing required fields: perceptualHash or objectKey")
            raise ValueError("perceptualHash and objectKey are required")
        
        # Extract asset ID from object key (uploads/{uuid}/{filename})
        try:
            asset_id = object_key.split('/')[1]
            original_filename = object_key.split('/')[-1]
        except IndexError:
            logger.warning(f"Could not extract asset ID from object key: {object_key}")
            asset_id = str(uuid.uuid4())
            original_filename = object_key.split('/')[-1] if '/' in object_key else object_key
        
        # Check for duplicate using perceptual hash
        try:
            response = table.query(
                IndexName='PerceptualHashIndex',
                KeyConditionExpression='perceptualHash = :hash',
                ExpressionAttributeValues={':hash': perceptual_hash}
            )
            
            if response['Items']:
                logger.warning(f"Duplicate image detected with hash: {perceptual_hash}")
                existing_item = response['Items'][0]
                
                # Return existing asset information
                return {
                    "assetId": existing_item['assetId'],
                    "perceptualHash": perceptual_hash,
                    "status": "DUPLICATE_DETECTED",
                    "timestamp": existing_item['timestamp'],
                    "originalAssetId": existing_item['assetId'],
                    "isDuplicate": True
                }
                
        except ClientError as e:
            logger.error(f"Error checking for duplicates: {str(e)}")
            # Continue with registration even if duplicate check fails
        
        # Create timestamp
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Prepare item for DynamoDB
        item = {
            'assetId': asset_id,
            'perceptualHash': perceptual_hash,
            'timestamp': timestamp,
            'status': 'REGISTERED',
            'originalFilename': original_filename,
            's3Key': object_key,
            'bucket': bucket_name,
            'metadata': {
                'fileSize': image_metadata.get('size', 0),
                'dimensions': {
                    'width': image_metadata.get('width', 0),
                    'height': image_metadata.get('height', 0)
                },
                'format': image_metadata.get('format', 'UNKNOWN'),
                'mode': image_metadata.get('mode', 'UNKNOWN')
            },
            'additionalHashes': additional_hashes
        }
        
        logger.info(f"Recording asset to ledger: {asset_id}")
        
        # Write to DynamoDB with condition to prevent overwrites
        try:
            table.put_item(
                Item=item,
                ConditionExpression='attribute_not_exists(assetId)'
            )
            
            metrics.add_metric(name="AssetRegistered", unit=MetricUnit.Count, value=1)
            logger.info(f"Successfully recorded asset {asset_id} to ledger")
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                logger.warning(f"Asset {asset_id} already exists in ledger")
                # Fetch existing item
                response = table.get_item(Key={'assetId': asset_id})
                if 'Item' in response:
                    existing_item = response['Item']
                    return {
                        "assetId": asset_id,
                        "perceptualHash": existing_item['perceptualHash'],
                        "status": "ALREADY_EXISTS",
                        "timestamp": existing_item['timestamp'],
                        "isDuplicate": False
                    }
            else:
                logger.error(f"DynamoDB error: {str(e)}")
                metrics.add_metric(name="LedgerWriteError", unit=MetricUnit.Count, value=1)
                raise
        
        # Prepare response
        result = {
            "assetId": asset_id,
            "perceptualHash": perceptual_hash,
            "status": "REGISTERED",
            "timestamp": timestamp,
            "s3Key": object_key,
            "isDuplicate": False
        }
        
        logger.info(f"Asset registration completed: {asset_id}")
        
        return result
        
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        metrics.add_metric(name="LedgerValidationError", unit=MetricUnit.Count, value=1)
        raise e
        
    except Exception as e:
        logger.error(f"Unexpected error in ledger recording: {str(e)}")
        metrics.add_metric(name="LedgerUnexpectedError", unit=MetricUnit.Count, value=1)
        raise e