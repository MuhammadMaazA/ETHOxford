import boto3
import json
import os
import logging
import io
from urllib.parse import unquote_plus
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
s3_client = boto3.client('s3')

@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event, context):
    """
    Compute perceptual hash of uploaded image
    
    Input: S3 event trigger or direct invocation with S3 object details
    
    Returns:
    {
        "perceptualHash": "a78fd4e2c1b89e3f",
        "objectKey": "uploads/uuid/filename.jpg",
        "bucket": "bucket-name",
        "imageMetadata": {
            "width": 1920,
            "height": 1080,
            "format": "JPEG",
            "mode": "RGB",
            "size": 1024576
        }
    }
    """
    
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Parse S3 event - handle both S3 event and direct invocation
        if 'Records' in event:
            # S3 event trigger
            record = event['Records'][0]
            bucket_name = record['s3']['bucket']['name']
            object_key = unquote_plus(record['s3']['object']['key'])
        else:
            # Direct invocation
            bucket_name = event.get('bucket')
            object_key = event.get('objectKey')
        
        if not bucket_name or not object_key:
            logger.error("Missing bucket name or object key in event")
            raise ValueError("Bucket name and object key are required")
        
        logger.info(f"Processing image: s3://{bucket_name}/{object_key}")
        
        # Download image from S3 into memory
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
            image_data = response['Body'].read()
            
            # Get file size
            file_size = len(image_data)
            logger.info(f"Downloaded image size: {file_size} bytes")
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.error(f"Object not found: s3://{bucket_name}/{object_key}")
                raise ValueError(f"File not found: {object_key}")
            else:
                logger.error(f"Failed to download object: {str(e)}")
                raise
        
        # Open image with PIL
        try:
            image_buffer = io.BytesIO(image_data)
            image = Image.open(image_buffer)
            
            # Get image metadata
            image_metadata = {
                "width": image.width,
                "height": image.height,
                "format": image.format,
                "mode": image.mode,
                "size": file_size
            }
            
            logger.info(f"Image metadata: {image_metadata}")
            
            # Convert to RGB if necessary (for consistent hashing)
            if image.mode != 'RGB':
                logger.info(f"Converting image from {image.mode} to RGB")
                image = image.convert('RGB')
            
        except Exception as e:
            logger.error(f"Failed to process image: {str(e)}")
            raise ValueError(f"Invalid image file: {str(e)}")
        
        # Compute perceptual hash using imagehash
        try:
            # Use phash (perceptual hash) - most robust for duplicate detection
            phash = imagehash.phash(image, hash_size=16)  # 256-bit hash
            phash_string = str(phash)
            
            logger.info(f"Computed perceptual hash: {phash_string}")
            
            # Also compute additional hashes for comparison
            ahash = str(imagehash.average_hash(image, hash_size=16))
            dhash = str(imagehash.dhash(image, hash_size=16))
            
            metrics.add_metric(name="ImageHashComputed", unit=MetricUnit.Count, value=1)
            
        except Exception as e:
            logger.error(f"Failed to compute hash: {str(e)}")
            metrics.add_metric(name="ImageHashError", unit=MetricUnit.Count, value=1)
            raise ValueError(f"Failed to compute image hash: {str(e)}")
        
        # Prepare response
        result = {
            "perceptualHash": phash_string,
            "objectKey": object_key,
            "bucket": bucket_name,
            "imageMetadata": image_metadata,
            "additionalHashes": {
                "averageHash": ahash,
                "differenceHash": dhash
            }
        }
        
        logger.info(f"Hash computation completed successfully for {object_key}")
        
        return result
        
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        metrics.add_metric(name="HashValidationError", unit=MetricUnit.Count, value=1)
        raise e
        
    except Exception as e:
        logger.error(f"Unexpected error in hash computation: {str(e)}")
        metrics.add_metric(name="HashUnexpectedError", unit=MetricUnit.Count, value=1)
        raise e