#!/bin/bash

# Hatchmark Production Deployment Script
# This script deploys the AWS backend infrastructure to production

set -e  # Exit on any error

echo "🚀 Starting Hatchmark Production Deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo "📋 Deployment Details:"
echo "   AWS Account ID: $AWS_ACCOUNT_ID"
echo "   AWS Region: $AWS_REGION"
echo "   Environment: production"

# Navigate to backend directory
cd backend

echo "🔨 Building SAM application..."
sam build --use-container

echo "🚀 Deploying to AWS..."
sam deploy --config-env prod --no-confirm-changeset --no-fail-on-empty-changeset

echo "📦 Getting deployment outputs..."
STACK_NAME="hatchmark-authenticity-service-prod"

# Get the API Gateway URL
API_GATEWAY_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`HttpApiUrl`].OutputValue' \
    --output text)

# Get the S3 bucket names
INGESTION_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`IngestionBucketName`].OutputValue' \
    --output text)

PROCESSED_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ProcessedBucketName`].OutputValue' \
    --output text)

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Production Environment Details:"
echo "   API Gateway URL: $API_GATEWAY_URL"
echo "   Ingestion Bucket: $INGESTION_BUCKET"
echo "   Processed Bucket: $PROCESSED_BUCKET"
echo ""
echo "🔧 Next Steps for Vercel:"
echo "1. Go to your Vercel project settings"
echo "2. Add these environment variables:"
echo "   NEXT_PUBLIC_API_GATEWAY_URL=$API_GATEWAY_URL"
echo "   NEXT_PUBLIC_AWS_REGION=$AWS_REGION"
echo "   NEXT_PUBLIC_INGESTION_BUCKET=$INGESTION_BUCKET"
echo "   NEXT_PUBLIC_PROCESSED_BUCKET=$PROCESSED_BUCKET"
echo ""
echo "3. Redeploy your Vercel application to pick up the new environment variables"
echo ""
echo "🎉 Your Hatchmark backend is now live in production!"

# Create ECR repository if it doesn't exist
echo "🐳 Setting up ECR repository for watermarker..."
aws ecr describe-repositories --repository-names hatchmark-watermarker 2>/dev/null || \
aws ecr create-repository --repository-name hatchmark-watermarker --image-scanning-configuration scanOnPush=true

echo "📝 ECR Repository Commands (run these to deploy the watermarker):"
echo "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
echo "cd ../watermarker"
echo "docker build -t hatchmark-watermarker ."
echo "docker tag hatchmark-watermarker:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest"
echo "docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest"

cd ..
echo "🏁 Production deployment script completed!"
