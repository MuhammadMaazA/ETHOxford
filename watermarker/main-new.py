import os
import json
import time
import logging
import boto3
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
from io import BytesIO
import threading
from concurrent.futures import ThreadPoolExecutor
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# AWS clients
s3_client = boto3.client('s3')
sqs_client = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')

# Environment variables
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')
INGESTION_BUCKET = os.environ.get('INGESTION_BUCKET')
PROCESSED_BUCKET = os.environ.get('PROCESSED_BUCKET')
ASSETS_TABLE = os.environ.get('ASSETS_TABLE', 'hatchmark-assets-dev')

# Initialize DynamoDB table
table = dynamodb.Table(ASSETS_TABLE)

class HatchmarkWatermarker:
    def __init__(self):
        self.shutdown_event = threading.Event()
        self.max_workers = int(os.environ.get('MAX_WORKERS', '4'))
        
    def apply_invisible_watermark(self, image_data, asset_id):
        """
        Apply an invisible watermark to the image using advanced steganography
        """
        try:
            # Open image
            image = Image.open(BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            img_array = np.array(image)
            height, width, channels = img_array.shape
            
            # Generate watermark pattern based on asset_id
            watermark_seed = hashlib.sha256(asset_id.encode()).hexdigest()
            np.random.seed(int(watermark_seed[:8], 16))
            
            # Create subtle noise pattern
            watermark_pattern = np.random.randint(-2, 3, size=(height, width, channels))
            
            # Apply watermark to LSBs (Least Significant Bits)
            watermarked_array = img_array.copy()
            
            # Modify the least significant bit of each color channel
            for c in range(channels):
                # Create mask for pixels to modify (not all pixels)
                mask = np.random.random((height, width)) < 0.1  # Modify 10% of pixels
                
                # Apply subtle changes to LSB
                lsb_changes = watermark_pattern[:, :, c] * mask
                watermarked_array[:, :, c] = np.clip(
                    watermarked_array[:, :, c] + lsb_changes, 0, 255
                )
            
            # Convert back to PIL Image
            watermarked_image = Image.fromarray(watermarked_array.astype(np.uint8))
            
            # Additional subtle enhancement to embed more data
            enhancer = ImageEnhance.Contrast(watermarked_image)
            watermarked_image = enhancer.enhance(1.001)  # Very subtle contrast change
            
            # Save to bytes
            output_buffer = BytesIO()
            watermarked_image.save(output_buffer, format='JPEG', quality=95, optimize=True)
            output_buffer.seek(0)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Error applying watermark: {str(e)}")
            raise e
    
    def process_file(self, message_body):
        """
        Process a single file for watermarking
        """
        try:
            # Parse message
            if isinstance(message_body, str):
                data = json.loads(message_body)
            else:
                data = message_body
            
            asset_id = data.get('assetId')
            bucket = data.get('bucket')
            object_key = data.get('objectKey')
            
            if not all([asset_id, bucket, object_key]):
                raise ValueError(f"Missing required fields in message: {data}")
            
            logger.info(f"Processing file: {object_key} for asset: {asset_id}")
            
            # Update status to processing
            self.update_asset_status(asset_id, 'WATERMARKING')
            
            # Download file from S3
            response = s3_client.get_object(Bucket=bucket, Key=object_key)
            image_data = response['Body'].read()
            
            # Apply watermark
            watermarked_data = self.apply_invisible_watermark(image_data, asset_id)
            
            # Generate output key
            file_extension = object_key.split('.')[-1] if '.' in object_key else 'jpg'
            output_key = f"watermarked/{asset_id}.{file_extension}"
            
            # Upload watermarked file
            s3_client.put_object(
                Bucket=PROCESSED_BUCKET,
                Key=output_key,
                Body=watermarked_data,
                ContentType='image/jpeg',
                Metadata={
                    'asset-id': asset_id,
                    'watermarked': 'true',
                    'original-key': object_key
                }
            )
            
            # Update asset record
            self.update_asset_status(asset_id, 'COMPLETED', {
                'watermarkedKey': output_key,
                'processedBucket': PROCESSED_BUCKET,
                'processedAt': time.time()
            })
            
            logger.info(f"Successfully processed asset: {asset_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            if 'asset_id' in locals():
                self.update_asset_status(asset_id, 'FAILED', {
                    'error': str(e),
                    'failedAt': time.time()
                })
            raise e
    
    def update_asset_status(self, asset_id, status, additional_data=None):
        """
        Update asset status in DynamoDB
        """
        try:
            update_expression = "SET #status = :status, #updated = :updated"
            expression_attribute_names = {
                '#status': 'status',
                '#updated': 'lastUpdated'
            }
            expression_attribute_values = {
                ':status': status,
                ':updated': int(time.time())
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
            
        except Exception as e:
            logger.error(f"Error updating asset status: {str(e)}")
    
    def poll_sqs_messages(self):
        """
        Poll SQS for messages and process them
        """
        logger.info(f"Starting SQS polling on queue: {SQS_QUEUE_URL}")
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            while not self.shutdown_event.is_set():
                try:
                    # Poll for messages
                    response = sqs_client.receive_message(
                        QueueUrl=SQS_QUEUE_URL,
                        MaxNumberOfMessages=10,
                        WaitTimeSeconds=20,  # Long polling
                        MessageAttributeNames=['All'],
                        AttributeNames=['All']
                    )
                    
                    messages = response.get('Messages', [])
                    
                    if messages:
                        logger.info(f"Received {len(messages)} messages")
                        
                        # Process messages concurrently
                        futures = []
                        for message in messages:
                            future = executor.submit(self.process_message, message)
                            futures.append(future)
                        
                        # Wait for all messages to complete
                        for future in futures:
                            try:
                                future.result(timeout=300)  # 5 minute timeout per message
                            except Exception as e:
                                logger.error(f"Error processing message: {str(e)}")
                    else:
                        logger.debug("No messages received")
                        
                except Exception as e:
                    logger.error(f"Error polling SQS: {str(e)}")
                    time.sleep(10)  # Wait before retrying
    
    def process_message(self, message):
        """
        Process individual SQS message
        """
        try:
            receipt_handle = message['ReceiptHandle']
            message_body = message['Body']
            
            # Process the file
            self.process_file(message_body)
            
            # Delete message from queue after successful processing
            sqs_client.delete_message(
                QueueUrl=SQS_QUEUE_URL,
                ReceiptHandle=receipt_handle
            )
            
            logger.info("Message processed and deleted successfully")
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            # Message will remain in queue for retry
    
    def run(self):
        """
        Main run method
        """
        logger.info("Starting Hatchmark Watermarker Service")
        
        # Validate environment
        if not all([SQS_QUEUE_URL, INGESTION_BUCKET, PROCESSED_BUCKET]):
            raise ValueError("Missing required environment variables")
        
        try:
            self.poll_sqs_messages()
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
            self.shutdown_event.set()
        except Exception as e:
            logger.error(f"Fatal error: {str(e)}")
            raise e

if __name__ == "__main__":
    watermarker = HatchmarkWatermarker()
    watermarker.run()
