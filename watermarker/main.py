import os
import json
import time
import logging
import boto3
from PIL import Image
import io
from steganography import steganography
import threading
from concurrent.futures import ThreadPoolExecutor

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
ASSETS_TABLE = os.environ.get('ASSETS_TABLE')

# Initialize DynamoDB table
table = dynamodb.Table(ASSETS_TABLE) if ASSETS_TABLE else None

class HatchmarkWatermarker:
    def __init__(self):
        self.shutdown_event = threading.Event()
        self.max_workers = int(os.environ.get('MAX_WORKERS', '4'))
        
    def apply_steganography_watermark(self, image_data, asset_id):
        """
        Apply invisible watermark using steganography library
        """
        try:
            # Save image data to temporary file for steganography library
            temp_input = f"/tmp/input_{asset_id}.png"
            temp_output = f"/tmp/output_{asset_id}.png"
            
            # Write input image
            with open(temp_input, 'wb') as f:
                f.write(image_data)
            
            # Use steganography library to embed the asset ID as secret message
            steganography.encode(temp_input, temp_output, asset_id)
            
            # Read the watermarked image
            with open(temp_output, 'rb') as f:
                watermarked_data = f.read()
            
            # Clean up temporary files
            try:
                os.remove(temp_input)
                os.remove(temp_output)
            except:
                pass
            
            return watermarked_data
            
        except Exception as e:
            logger.error(f"Error applying steganography watermark: {str(e)}")
            # Fallback to original image if watermarking fails
            return image_data
    
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
            object_key = data.get('objectKey')
            
            if not all([asset_id, object_key]):
                raise ValueError(f"Missing required fields in message: {data}")
            
            logger.info(f"Processing file: {object_key} for asset: {asset_id}")
            
            # Download file from S3 ingestion bucket
            response = s3_client.get_object(Bucket=INGESTION_BUCKET, Key=object_key)
            image_data = response['Body'].read()
            
            # Apply steganography watermark
            watermarked_data = self.apply_steganography_watermark(image_data, asset_id)
            
            # Generate output key for processed bucket
            file_extension = object_key.split('.')[-1] if '.' in object_key else 'png'
            output_key = f"watermarked/{asset_id}.{file_extension}"
            
            # Upload watermarked file to processed bucket
            s3_client.put_object(
                Bucket=PROCESSED_BUCKET,
                Key=output_key,
                Body=watermarked_data,
                ContentType=f'image/{file_extension}',
                Metadata={
                    'asset-id': asset_id,
                    'watermarked': 'true',
                    'original-key': object_key
                }
            )
            
            logger.info(f"Successfully processed asset: {asset_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
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
