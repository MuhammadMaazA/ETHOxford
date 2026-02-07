#!/usr/bin/env python3
"""
Hatchmark Complete Setup Script
Sets up the entire Hatchmark Digital Authenticity Service
"""

import os
import sys
import subprocess
import json
import boto3
import time
from pathlib import Path

def run_command(command, check=True, capture_output=False):
    """Run a shell command"""
    try:
        if capture_output:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, check=check)
            return result.stdout.strip()
        else:
            result = subprocess.run(command, shell=True, check=check)
            return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {command}")
        print(f"Error: {e}")
        return False

def check_aws_credentials():
    """Check if AWS credentials are configured"""
    try:
        session = boto3.Session(profile_name='hatchmark-dev')
        sts = session.client('sts')
        identity = sts.get_caller_identity()
        print(f"AWS credentials configured for account: {identity['Account']}")
        return True
    except Exception as e:
        print(f"AWS credentials not configured: {e}")
        return False

def setup_virtual_environment():
    """Set up Python virtual environment"""
    print("Setting up Python virtual environment...")
    
    if not os.path.exists('.venv'):
        run_command('python3 -m venv .venv')
    
    # Install backend requirements
    run_command('.venv/bin/pip install -r backend/src/requirements.txt')
    run_command('.venv/bin/pip install flask flask-cors')
    
    print("Virtual environment setup complete")

def setup_s3_buckets():
    """Create S3 buckets if they don't exist"""
    print("Setting up S3 buckets...")
    
    session = boto3.Session(profile_name='hatchmark-dev')
    s3 = session.client('s3')
    
    buckets = ['hatchmark-ingestion-bucket-36933227', 'hatchmark-processed-bucket-36933227']
    
    for bucket_name in buckets:
        try:
            s3.head_bucket(Bucket=bucket_name)
            print(f"Bucket {bucket_name} already exists")
        except:
            try:
                s3.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': 'eu-west-1'}
                )
                
                # Enable versioning
                s3.put_bucket_versioning(
                    Bucket=bucket_name,
                    VersioningConfiguration={'Status': 'Enabled'}
                )
                
                # Block public access
                s3.put_public_access_block(
                    Bucket=bucket_name,
                    PublicAccessBlockConfiguration={
                        'BlockPublicAcls': True,
                        'IgnorePublicAcls': True,
                        'BlockPublicPolicy': True,
                        'RestrictPublicBuckets': True
                    }
                )
                
                print(f"Created and configured bucket: {bucket_name}")
            except Exception as e:
                print(f"Failed to create bucket {bucket_name}: {e}")

def setup_dynamodb_table():
    """Create DynamoDB table for asset tracking"""
    print("Setting up DynamoDB table...")
    
    session = boto3.Session(profile_name='hatchmark-dev')
    dynamodb = session.client('dynamodb')
    
    table_name = 'hatchmark-assets'
    
    try:
        dynamodb.describe_table(TableName=table_name)
        print(f"DynamoDB table {table_name} already exists")
    except dynamodb.exceptions.ResourceNotFoundException:
        try:
            dynamodb.create_table(
                TableName=table_name,
                KeySchema=[
                    {'AttributeName': 'assetId', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'assetId', 'AttributeType': 'S'},
                    {'AttributeName': 'perceptualHash', 'AttributeType': 'S'}
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'perceptualHash-index',
                        'KeySchema': [{'AttributeName': 'perceptualHash', 'KeyType': 'HASH'}],
                        'Projection': {'ProjectionType': 'ALL'},
                        'BillingMode': 'PAY_PER_REQUEST'
                    }
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            
            # Wait for table to be created
            waiter = dynamodb.get_waiter('table_exists')
            waiter.wait(TableName=table_name)
            
            # Enable point-in-time recovery
            dynamodb.put_backup_policy(
                TableName=table_name,
                BackupPolicy={'PointInTimeRecoveryEnabled': True}
            )
            
            print(f"Created DynamoDB table: {table_name}")
        except Exception as e:
            print(f"Failed to create DynamoDB table: {e}")

def build_and_deploy_sam():
    """Build and deploy SAM application"""
    print("Building and deploying SAM application...")
    
    os.chdir('backend')
    
    # Build SAM
    if not run_command('sam build --use-container'):
        print("SAM build failed")
        return False
    
    # Deploy SAM
    if not run_command('sam deploy --no-confirm-changeset --no-fail-on-empty-changeset --stack-name hatchmark-service --capabilities CAPABILITY_IAM --profile hatchmark-dev'):
        print("SAM deployment failed")
        return False
    
    print("SAM application deployed successfully")
    os.chdir('..')
    return True

def setup_frontend():
    """Setup and start frontend"""
    print("Setting up frontend...")
    
    os.chdir('frontend')
    
    # Install dependencies
    run_command('npm install')
    
    os.chdir('..')
    print("Frontend setup complete")

def main():
    """Main setup function"""
    print("Starting Hatchmark Complete Setup...")
    
    # Check prerequisites
    if not check_aws_credentials():
        print("Please configure AWS credentials first: aws configure --profile hatchmark-dev")
        return
    
    # Setup components
    setup_virtual_environment()
    setup_s3_buckets()
    setup_dynamodb_table()
    setup_frontend()
    
    print("\nSetup complete! You can now:")
    print("1. Start backend: cd backend && python local_dev_server.py")
    print("2. Start frontend: cd frontend && npm run dev")
    print("3. Deploy to AWS: cd backend && sam deploy --guided --profile hatchmark-dev")

if __name__ == '__main__':
    main()
