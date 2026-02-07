import json
import boto3
import uuid
from datetime import datetime
import logging
import os

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['ASSETS_TABLE']
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    """
    Store asset metadata and perceptual hash in DynamoDB
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract data from the event (coming from hash function)
        bucket = event.get('bucket')
        object_key = event.get('objectKey') 
        perceptual_hash = event.get('perceptualHash')
        file_metadata = event.get('fileMetadata', {})
        
        if not all([bucket, object_key, perceptual_hash]):
            raise ValueError("Missing required fields: bucket, objectKey, or perceptualHash")
        
        # Generate unique asset ID
        asset_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Prepare item for DynamoDB
        item = {
            'assetId': asset_id,
            'perceptualHash': perceptual_hash,
            'bucket': bucket,
            'objectKey': object_key,
            'timestamp': timestamp,
            'status': 'PROCESSING',
            'fileMetadata': file_metadata
        }
        
        # Check for existing hash (duplicate detection)
        try:
            response = table.query(
                IndexName='PerceptualHashIndex',
                KeyConditionExpression='perceptualHash = :hash',
                ExpressionAttributeValues={':hash': perceptual_hash}
            )
            
            if response['Items']:
                logger.warning(f"Duplicate hash found: {perceptual_hash}")
                return {
                    'statusCode': 200,
                    'assetId': asset_id,
                    'isDuplicate': True,
                    'existingAssets': response['Items'],
                    'message': 'Duplicate content detected'
                }
        except Exception as e:
            logger.warning(f"Error checking for duplicates: {str(e)}")
        
        # Store in DynamoDB
        table.put_item(Item=item)
        
        logger.info(f"Successfully stored asset: {asset_id}")
        
        return {
            'statusCode': 200,
            'assetId': asset_id,
            'bucket': bucket,
            'objectKey': object_key,
            'perceptualHash': perceptual_hash,
            'timestamp': timestamp,
            'isDuplicate': False,
            'message': 'Asset metadata stored successfully'
        }
        
    except Exception as e:
        logger.error(f"Error storing asset metadata: {str(e)}")
        raise e

def update_asset_status(asset_id, status, additional_data=None):
    """
    Helper function to update asset status
    """
    try:
        update_expression = "SET #status = :status, #updated = :updated"
        expression_attribute_names = {
            '#status': 'status',
            '#updated': 'lastUpdated'
        }
        expression_attribute_values = {
            ':status': status,
            ':updated': datetime.utcnow().isoformat()
        }
        
        if additional_data:
            for key, value in additional_data.items():
                update_expression += f", #{key} = :{key}"
                expression_attribute_names[f'#{key}'] = key
                expression_attribute_values[f':{key}'] = value
        
        table.update_item(
            Key={'assetId': asset_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
        
        logger.info(f"Updated asset {asset_id} status to {status}")
        
    except Exception as e:
        logger.error(f"Error updating asset status: {str(e)}")
        raise e
