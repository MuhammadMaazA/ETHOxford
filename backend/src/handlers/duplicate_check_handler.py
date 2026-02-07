import json
import boto3
import base64
import io
from PIL import Image
import imagehash
import os
from boto3.dynamodb.conditions import Key

def lambda_handler(event, context):
    """
    Lambda function to check for duplicate images based on perceptual hash
    """
    try:
        # Parse the incoming request
        body = json.loads(event.get('body', '{}'))
        
        # Handle base64 encoded file from frontend
        if 'fileData' in body:
            file_data = base64.b64decode(body['fileData'])
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                },
                'body': json.dumps({
                    'error': 'No file data provided'
                })
            }
        
        # Calculate perceptual hash
        image = Image.open(io.BytesIO(file_data))
        phash = str(imagehash.phash(image))
        
        # Check DynamoDB for existing assets with similar hash
        dynamodb = boto3.resource('dynamodb')
        table_name = os.environ['ASSETS_TABLE']
        table = dynamodb.Table(table_name)
        
        # Query the PerceptualHashIndex for exact matches
        response = table.query(
            IndexName='PerceptualHashIndex',
            KeyConditionExpression=Key('perceptualHash').eq(phash)
        )
        
        if response['Items']:
            # Found exact match
            existing_asset = response['Items'][0]
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                },
                'body': json.dumps({
                    'isDuplicate': True,
                    'perceptualHash': phash,
                    'existingAsset': {
                        'assetId': existing_asset['assetId'],
                        'creator': existing_asset.get('creator', 'Unknown'),
                        'timestamp': existing_asset.get('timestamp', ''),
                        'originalFilename': existing_asset.get('originalFilename', 'Unknown')
                    }
                })
            }
        
        # Check for similar hashes (Hamming distance <= 5)
        # For production, we might want to implement a more efficient similarity search
        all_assets_response = table.scan(
            ProjectionExpression='assetId, perceptualHash, creator, timestamp, originalFilename'
        )
        
        similar_assets = []
        for asset in all_assets_response['Items']:
            if 'perceptualHash' in asset:
                try:
                    existing_hash = imagehash.hex_to_hash(asset['perceptualHash'])
                    current_hash = imagehash.hex_to_hash(phash)
                    hamming_distance = current_hash - existing_hash
                    
                    if hamming_distance <= 5:  # Similar image threshold
                        similar_assets.append({
                            'assetId': asset['assetId'],
                            'creator': asset.get('creator', 'Unknown'),
                            'timestamp': asset.get('timestamp', ''),
                            'originalFilename': asset.get('originalFilename', 'Unknown'),
                            'similarity': hamming_distance
                        })
                except Exception as e:
                    # Skip invalid hashes
                    continue
        
        if similar_assets:
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                },
                'body': json.dumps({
                    'isDuplicate': True,
                    'perceptualHash': phash,
                    'existingAsset': similar_assets[0],  # Return the most similar one
                    'similarAssets': similar_assets
                })
            }
        
        # No duplicates found
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({
                'isDuplicate': False,
                'perceptualHash': phash
            })
        }
        
    except Exception as e:
        print(f"Error in duplicate check: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }
