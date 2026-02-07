#!/usr/bin/env python3
"""
Hatchmark Setup Script
Complete setup for the Hatchmark Digital Authenticity Service
"""

import boto3
import subprocess
import os
import sys
import json
import time
from botocore.exceptions import ClientError

def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_step(step):
    """Print a formatted step."""
    print(f"\n- {step}")

def check_prerequisites():
    """Check that all required tools are installed."""
    print_section("CHECKING PREREQUISITES")
    
    requirements = [
        ("aws", "AWS CLI"),
        ("sam", "AWS SAM CLI"),
        ("docker", "Docker")
    ]
    
    missing = []
    for cmd, name in requirements:
        try:
            subprocess.run([cmd, "--version"], capture_output=True, check=True)
            print(f"[OK] {name} is installed")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f"[MISSING] {name} is not installed")
            missing.append(name)
    
    if missing:
        print(f"\nPlease install the following tools: {', '.join(missing)}")
        sys.exit(1)
    
    # Check AWS credentials
    try:
        boto3.client('sts').get_caller_identity()
        print(" AWS credentials are configured")
    except Exception:
        print(" AWS credentials not configured. Run 'aws configure'")
        sys.exit(1)

def create_ecr_repository():
    """Create ECR repository for the watermarker image."""
    print_step("Creating ECR repository")
    
    ecr = boto3.client('ecr')
    repo_name = "hatchmark-watermarker"
    
    try:
        response = ecr.describe_repositories(repositoryNames=[repo_name])
        print(f" ECR repository '{repo_name}' already exists")
        return response['repositories'][0]['repositoryUri']
    except ClientError as e:
        if e.response['Error']['Code'] == 'RepositoryNotFoundException':
            try:
                response = ecr.create_repository(repositoryName=repo_name)
                print(f" Created ECR repository '{repo_name}'")
                return response['repository']['repositoryUri']
            except Exception as e:
                print(f" Failed to create ECR repository: {e}")
                sys.exit(1)
        else:
            print(f" Error checking ECR repository: {e}")
            sys.exit(1)

def build_and_push_watermarker(ecr_uri):
    """Build and push the watermarker Docker image."""
    print_step("Building and pushing watermarker image")
    
    try:
        # Get ECR login token
        region = boto3.Session().region_name or 'us-east-1'
        login_cmd = f"aws ecr get-login-password --region {region} | docker login --username AWS --password-stdin {ecr_uri.split('/')[0]}"
        subprocess.run(login_cmd, shell=True, check=True)
        print(" Logged into ECR")
        
        # Build image
        subprocess.run(["docker", "build", "-t", "hatchmark-watermarker", "./watermarker"], check=True)
        print(" Built watermarker image")
        
        # Tag and push
        subprocess.run(["docker", "tag", "hatchmark-watermarker:latest", f"{ecr_uri}:latest"], check=True)
        subprocess.run(["docker", "push", f"{ecr_uri}:latest"], check=True)
        print(" Pushed watermarker image to ECR")
        
    except subprocess.CalledProcessError as e:
        print(f" Failed to build/push watermarker: {e}")
        sys.exit(1)

def deploy_sam_stack():
    """Deploy the SAM stack."""
    print_step("Deploying SAM stack")
    
    try:
        # Build SAM application
        subprocess.run(["sam", "build"], cwd="backend", check=True)
        print(" Built SAM application")
        
        # Deploy SAM stack
        stack_name = "hatchmark-dev"
        subprocess.run([
            "sam", "deploy",
            "--stack-name", stack_name,
            "--capabilities", "CAPABILITY_NAMED_IAM",
            "--resolve-s3",
            "--parameter-overrides",
            "IngestionBucketName=hatchmark-ingestion-bucket-20250823004849",
            "ProcessedBucketName=hatchmark-processed-bucket-20250823004849"
        ], cwd="backend", check=True)
        print(" Deployed SAM stack")
        
        return stack_name
        
    except subprocess.CalledProcessError as e:
        print(f" Failed to deploy SAM stack: {e}")
        sys.exit(1)

def setup_dynamodb_tables():
    """Set up DynamoDB tables and indexes."""
    print_step("Setting up DynamoDB tables")
    
    try:
        # DynamoDB tables are created via SAM template
        print(" DynamoDB tables will be created during SAM deployment")
    except Exception as e:
        print(f" Note: {e}")
        print("Tables will be created automatically via CloudFormation")

def get_stack_outputs(stack_name):
    """Get CloudFormation stack outputs."""
    print_step("Getting deployment outputs")
    
    try:
        cf = boto3.client('cloudformation')
        response = cf.describe_stacks(StackName=stack_name)
        outputs = response['Stacks'][0].get('Outputs', [])
        
        output_dict = {}
        for output in outputs:
            output_dict[output['OutputKey']] = output['OutputValue']
        
        return output_dict
    except Exception as e:
        print(f" Failed to get stack outputs: {e}")
        return {}

def display_results(outputs):
    """Display the deployment results."""
    print_section("DEPLOYMENT COMPLETE")
    
    if 'HatchmarkApiGatewayUrl' in outputs:
        api_url = outputs['HatchmarkApiGatewayUrl']
        print(f"API Gateway URL: {api_url}")
        print(f"   Upload endpoint: {api_url}uploads/initiate")
        print(f"   Verify endpoint: {api_url}verify")
    
    if 'IngestionBucket' in outputs:
        print(f"Ingestion Bucket: {outputs['IngestionBucket']}")
    
    if 'ProcessedBucket' in outputs:
        print(f"Processed Bucket: {outputs['ProcessedBucket']}")
    
    if 'DynamoDBTable' in outputs:
        print(f"Database Table: {outputs['DynamoDBTable']}")
    
    print("\nHatchmark is now deployed and ready to use!")
    print("\nNext steps:")
    print("1. Test the upload endpoint with the frontend")
    print("2. Upload a test image and verify the workflow")
    print("3. Check CloudWatch logs for any issues")

def main():
    """Main setup function."""
    print_section("HATCHMARK SETUP")
    print("Setting up the complete Hatchmark Digital Authenticity Service")
    
    # Check prerequisites
    check_prerequisites()
    
    # Create ECR repository and build watermarker
    ecr_uri = create_ecr_repository()
    build_and_push_watermarker(ecr_uri)
    
    # Deploy SAM stack
    stack_name = deploy_sam_stack()
    
    # Setup DynamoDB
    setup_dynamodb_tables()
    
    # Get and display results
    outputs = get_stack_outputs(stack_name)
    display_results(outputs)

if __name__ == "__main__":
    main()
