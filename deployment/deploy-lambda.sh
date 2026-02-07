#!/bin/bash

# Deploy Lambda functions with dependencies
# This creates a second CloudFormation stack with Lambda functions and API Gateway

set -e

PROJECT_NAME="hatchmark"
ENVIRONMENT="dev"
STACK_NAME="${PROJECT_NAME}-lambda-${ENVIRONMENT}"
TEMPLATE_FILE="cloudformation-lambda.yaml"
LAMBDA_ZIP="lambda-functions.zip"

echo "🚀 Starting Lambda deployment of ${STACK_NAME}..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="${SCRIPT_DIR}/${TEMPLATE_FILE}"
LAMBDA_ZIP_PATH="${SCRIPT_DIR}/${LAMBDA_ZIP}"

if [ ! -f "$TEMPLATE_PATH" ]; then
    echo "❌ Template file not found: $TEMPLATE_PATH"
    exit 1
fi

if [ ! -f "$LAMBDA_ZIP_PATH" ]; then
    echo "❌ Lambda ZIP file not found: $LAMBDA_ZIP_PATH"
    echo "📦 Creating Lambda deployment package..."
    
    # Create Lambda package if it doesn't exist
    cd "$SCRIPT_DIR"
    if [ ! -d "lambda-package" ]; then
        mkdir lambda-package
        cd lambda-package
        pip install --target . pillow imagehash boto3
        cp ../../../backend/src/handlers.py .
        cd ..
        zip -r lambda-functions.zip lambda-package/
    fi
fi

echo "✅ Template and Lambda package found"

# Upload Lambda ZIP to S3 (we need a bucket for this)
LAMBDA_BUCKET="${PROJECT_NAME}-lambda-code-${ENVIRONMENT}-${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"

# Create S3 bucket for Lambda code if it doesn't exist
if ! aws s3api head-bucket --bucket "${LAMBDA_BUCKET}" 2>/dev/null; then
    echo "📦 Creating S3 bucket for Lambda code: ${LAMBDA_BUCKET}"
    aws s3 mb "s3://${LAMBDA_BUCKET}"
fi

# Upload Lambda ZIP to S3
echo "⬆️ Uploading Lambda package to S3..."
aws s3 cp "${LAMBDA_ZIP_PATH}" "s3://${LAMBDA_BUCKET}/lambda-functions.zip"

# Validate CloudFormation template
echo "🔍 Validating CloudFormation template..."
aws cloudformation validate-template --template-body file://${TEMPLATE_PATH}

if [ $? -eq 0 ]; then
    echo "✅ Template validation successful"
else
    echo "❌ Template validation failed"
    exit 1
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_EXISTS" = "DOES_NOT_EXIST" ]; then
    echo "📦 Creating new stack: ${STACK_NAME}"
    aws cloudformation create-stack \
        --stack-name ${STACK_NAME} \
        --template-body file://${TEMPLATE_PATH} \
        --parameters ParameterKey=ProjectName,ParameterValue=${PROJECT_NAME} \
                    ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
        --capabilities CAPABILITY_IAM \
        --tags Key=Project,Value=${PROJECT_NAME} \
               Key=Environment,Value=${ENVIRONMENT}
    
    echo "⏳ Waiting for stack creation to complete..."
    aws cloudformation wait stack-create-complete --stack-name ${STACK_NAME}
else
    echo "🔄 Updating existing stack: ${STACK_NAME}"
    aws cloudformation update-stack \
        --stack-name ${STACK_NAME} \
        --template-body file://${TEMPLATE_PATH} \
        --parameters ParameterKey=ProjectName,ParameterValue=${PROJECT_NAME} \
                    ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
        --capabilities CAPABILITY_IAM \
        --tags Key=Project,Value=${PROJECT_NAME} \
               Key=Environment,Value=${ENVIRONMENT} || echo "No updates to perform"
    
    echo "⏳ Waiting for stack update to complete..."
    aws cloudformation wait stack-update-complete --stack-name ${STACK_NAME} || echo "Update completed or no changes"
fi

# Get stack outputs
echo "📋 Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

echo "✅ Lambda deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Test the API endpoints"
echo "2. Update frontend configuration with new API URLs"
echo "3. Test end-to-end workflow"
