#!/bin/bash

# Simplified deployment script for core infrastructure
# This deploys the basic AWS resources without circular dependencies

set -e

PROJECT_NAME="hatchmark"
ENVIRONMENT="dev"
STACK_NAME="${PROJECT_NAME}-infrastructure-${ENVIRONMENT}"
TEMPLATE_FILE="cloudformation-simple.yaml"

echo "🚀 Starting simplified deployment of ${STACK_NAME}..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="${SCRIPT_DIR}/${TEMPLATE_FILE}"

if [ ! -f "$TEMPLATE_PATH" ]; then
    echo "❌ Template file not found: $TEMPLATE_PATH"
    exit 1
fi

echo "✅ Template file found: $TEMPLATE_PATH"

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
        --capabilities CAPABILITY_NAMED_IAM \
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
        --capabilities CAPABILITY_NAMED_IAM \
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

echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Deploy Lambda functions using the second CloudFormation template"
echo "2. Deploy API Gateway and Step Functions"
echo "3. Test the infrastructure"
