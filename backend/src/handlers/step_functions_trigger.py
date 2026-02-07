#!/usr/bin/env python3
"""
Step Functions Trigger Handler
Triggers the notarization workflow when an image is uploaded to S3
"""

import json
import boto3
import os
from datetime import datetime

stepfunctions = boto3.client('stepfunctions')

def trigger_notarization_workflow(event, context):
    """
    S3 event handler that triggers Step Functions workflow
    """
    try:
        # Parse S3 event
        for record in event['Records']:
            s3_event = record['s3']
            bucket_name = s3_event['bucket']['name']
            object_key = s3_event['object']['key']
            
            # Only process uploads/ prefix
            if not object_key.startswith('uploads/'):
                print(f"Skipping non-upload object: {object_key}")
                continue
                
            print(f"Triggering workflow for: s3://{bucket_name}/{object_key}")
            
            # Get Step Functions state machine ARN from environment
            state_machine_arn = os.environ.get('STATE_MACHINE_ARN')
            if not state_machine_arn:
                raise ValueError("STATE_MACHINE_ARN environment variable not set")
            
            # Extract filename from object key
            filename = object_key.split('/')[-1]
            
            # Start Step Functions execution
            execution_name = f"notarization-{object_key.replace('/', '-')}-{int(datetime.utcnow().timestamp())}"
            
            input_data = {
                "Records": [{
                    "s3": {
                        "bucket": {"name": bucket_name},
                        "object": {"key": object_key}
                    }
                }],
                "originalFilename": filename,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = stepfunctions.start_execution(
                stateMachineArn=state_machine_arn,
                name=execution_name,
                input=json.dumps(input_data)
            )
            
            print(f"Started execution: {response['executionArn']}")
            
        return {
            'statusCode': 200,
            'body': json.dumps('Workflow triggered successfully')
        }
        
    except Exception as e:
        print(f"Error triggering workflow: {str(e)}")
        raise e
