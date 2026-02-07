#!/usr/bin/env python3
"""
Hatchmark Watermarker Service
A containerized service that processes SQS messages and applies invisible watermarks to digital content
"""

import o            watermark_payload = {
                "service": "hatchmark",
                "version": "1.0",
                "assetId": asset_id,
                "perceptualHash": perceptual_hash,
                "timestamp": timestamp,
                "watermarked": datetime.utcnow().isoformat()
            }json
import time
import logging
import io
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import boto3
from botocore.exceptions import ClientError
from PIL import Image
from steganography.steganography import Steganography

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HatchmarkWatermarker:
    """Event-driven watermarker service that processes SQS messages"""
    
    def __init__(self):
        """Initialize the watermarker with AWS clients and configuration"""
        self.sqs_queue_url = os.environ.get('SQS_QUEUE_URL')
        self.ingestion_bucket = os.environ.get('INGESTION_BUCKET')
        self.processed_bucket = os.environ.get('PROCESSED_BUCKET')
        
        if not all([self.sqs_queue_url, self.ingestion_bucket, self.processed_bucket]):
            raise ValueError(
                "Missing required environment variables: "
                "SQS_QUEUE_URL, INGESTION_BUCKET, PROCESSED_BUCKET"
            )
        
        # Initialize AWS clients
        self.s3_client = boto3.client('s3')
        self.sqs_client = boto3.client('sqs')
        
        logger.info("Hatchmark Watermarker initialized with:")
        logger.info(f"  SQS Queue: {self.sqs_queue_url}")
        logger.info(f"  Ingestion Bucket: {self.ingestion_bucket}")
        logger.info(f"  Processed Bucket: {self.processed_bucket}")
    
    def run(self):
        """Main processing loop - polls SQS queue for watermarking jobs"""
        logger.info("Starting watermarker service main loop...")
        
        while True:
            try:
                # Poll SQS queue for messages with long polling
                logger.info("Polling SQS queue for watermarking jobs...")
                
                response = self.sqs_client.receive_message(
                    QueueUrl=self.sqs_queue_url,
                    MaxNumberOfMessages=1,
                    WaitTimeSeconds=20,  # Long polling - wait up to 20 seconds
                    VisibilityTimeoutSeconds=900  # 15 minutes processing window
                )
                
                messages = response.get('Messages', [])
                
                if not messages:
                    logger.info("No messages in queue, continuing to poll...")
                    continue
                
                # Process each message
                for message in messages:
                    message_id = message['MessageId']
                    receipt_handle = message['ReceiptHandle']
                    
                    try:
                        logger.info(f"Processing message: {message_id}")
                        self.process_watermarking_job(message)
                        
                        # Delete message from queue after successful processing
                        self.sqs_client.delete_message(
                            QueueUrl=self.sqs_queue_url,
                            ReceiptHandle=receipt_handle
                        )
                        logger.info(f"Successfully processed and deleted message: {message_id}")
                        
                    except Exception as e:
                        logger.error(f"Error processing message {message_id}: {str(e)}")
                        # Message will be retried or sent to DLQ based on queue configuration
                        
            except Exception as e:
                logger.error(f"Error in main processing loop: {str(e)}")
                time.sleep(30)  # Wait before retrying
    
    def process_watermarking_job(self, message: Dict[str, Any]):
        """Process a single watermarking job from SQS message"""
        try:
            # Parse message body
            message_body = json.loads(message['Body'])
            
            # Handle nested message body structure from Step Functions
            if 'MessageBody' in message_body:
                job_data = message_body['MessageBody']
            else:
                job_data = message_body
            
            logger.info(f"Job data: {json.dumps(job_data, indent=2)}")
            
            # Extract required job parameters
            asset_id = job_data['assetId']
            object_key = job_data['objectKey']
            bucket = job_data.get('bucket', self.ingestion_bucket)
            perceptual_hash = job_data['perceptualHash']
            timestamp = job_data.get('timestamp', datetime.utcnow().isoformat())
            
            logger.info(f"Processing watermarking for asset: {asset_id}")
            
            # Step 1: Download original image from S3
            logger.info(f"Downloading image: s3://{bucket}/{object_key}")
            image_data = self.download_image_from_s3(bucket, object_key)
            
            # Step 2: Apply invisible watermark
            logger.info(f"Applying watermark with asset ID: {asset_id}")
            watermarked_data = self.apply_steganographic_watermark(
                image_data, asset_id, perceptual_hash, timestamp
            )
            
            # Step 3: Generate processed file key
            original_filename = object_key.split('/')[-1]
            processed_key = f"watermarked/{asset_id}/{original_filename}"
            
            # Step 4: Upload watermarked image to processed bucket
            logger.info(f"Uploading watermarked image: s3://{self.processed_bucket}/{processed_key}")
            self.upload_image_to_s3(
                watermarked_data, self.processed_bucket, processed_key, original_filename
            )
            
            logger.info(f"Successfully completed watermarking for asset: {asset_id}")
            
        except Exception as e:
            logger.error(f"Error in watermarking job: {str(e)}")
            raise
    
    def download_image_from_s3(self, bucket: str, object_key: str) -> bytes:
        """Download image from S3 and return as bytes"""
        try:
            response = self.s3_client.get_object(Bucket=bucket, Key=object_key)
            return response['Body'].read()
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                raise ValueError(f"File not found: s3://{bucket}/{object_key}")
            else:
                raise ValueError(f"Failed to download from S3: {str(e)}")
    
    def apply_steganographic_watermark(
        self, 
        image_data: bytes, 
        asset_id: str, 
        perceptual_hash: str,
        timestamp: str
    ) -> bytes:
        """Apply invisible watermark using steganography"""
        try:
            # Load image with PIL
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary for steganography
            if image.mode != 'RGB':
                logger.info(f"Converting image from {image.mode} to RGB for watermarking")
                image = image.convert('RGB')
            
            # Create comprehensive watermark payload
            watermark_payload = {
                "service": "hatchmark",
                "version": "1.0",
                "assetId": asset_id,
                "perceptualHash": perceptual_hash,
                "timestamp": timestamp,
                "watermarked": datetime.utcnow().isoformat()
            }
            
            watermark_message = json.dumps(watermark_payload, separators=(',', ':'))
            logger.info(f"Embedding watermark payload: {watermark_message}")
            
            # Apply steganographic watermark using LSB steganography
            watermarked_image = Steganography.encode(image, watermark_message)
            
            # Convert back to bytes
            output_buffer = io.BytesIO()
            
            # Preserve original format when possible
            original_format = image.format or 'JPEG'
            if original_format.upper() == 'JPEG':
                # Use high quality for JPEG to minimize compression artifacts
                watermarked_image.save(output_buffer, format='JPEG', quality=95, optimize=True)
            else:
                watermarked_image.save(output_buffer, format=original_format)
            
            output_buffer.seek(0)
            return output_buffer.read()
            
        except Exception as e:
            logger.error(f"Failed to apply watermark: {str(e)}")
            raise ValueError(f"Watermarking failed: {str(e)}")
    
    def upload_image_to_s3(
        self, 
        image_data: bytes, 
        bucket: str, 
        object_key: str, 
        original_filename: str
    ):
        """Upload watermarked image to S3 with appropriate metadata"""
        try:
            # Determine content type from file extension
            file_extension = original_filename.lower().split('.')[-1]
            content_type_mapping = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg', 
                'png': 'image/png',
                'webp': 'image/webp',
                'bmp': 'image/bmp',
                'tiff': 'image/tiff'
            }
            content_type = content_type_mapping.get(file_extension, 'image/jpeg')
            
            # Upload with comprehensive metadata
            self.s3_client.put_object(
                Bucket=bucket,
                Key=object_key,
                Body=image_data,
                ContentType=content_type,
                Metadata={
                    'watermarked': 'true',
                    'watermark-version': '1.0',
                    'watermark-service': 'hatchmark',
                    'original-filename': original_filename,
                    'processed-timestamp': datetime.utcnow().isoformat(),
                    'processor': 'hatchmark-watermarker-fargate'
                },
                ServerSideEncryption='AES256'  # Encrypt at rest
            )
            
            logger.info(f"Successfully uploaded watermarked image to s3://{bucket}/{object_key}")
            
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {str(e)}")
            raise ValueError(f"S3 upload failed: {str(e)}")

def main():
    """Main entry point for the containerized watermarker service"""
    logger.info("=== Hatchmark Watermarker Service Starting ===")
    
    try:
        # Initialize and run the watermarker service
        watermarker = HatchmarkWatermarker()
        watermarker.run()
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down gracefully...")
    except Exception as e:
        logger.error(f"Fatal error in watermarker service: {str(e)}")
        raise
    finally:
        logger.info("=== Hatchmark Watermarker Service Stopped ===")

if __name__ == "__main__":
    main()