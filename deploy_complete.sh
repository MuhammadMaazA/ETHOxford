#!/bin/bash

# Complete Production Deployment Script
# Deploys the full Hatchmark Authenticity Service according to your specifications

set -e

echo "🚀 Starting Complete Hatchmark Production Deployment"

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(wsl aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_DEFAULT_REGION:-eu-west-1}

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"

# Phase 1: Ensure Docker is running and build/push container
echo ""
echo "📦 Phase 1: Docker Container Setup"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and run this script again."
    echo "   After starting Docker, run: bash deploy_complete.sh"
    exit 1
fi

# Create ECR repository (ignore if exists)
echo "Creating ECR repository..."
wsl aws ecr create-repository \
    --repository-name hatchmark-watermarker \
    --image-scanning-configuration scanOnPush=true \
    --region $AWS_REGION 2>/dev/null || echo "Repository already exists"

# Get ECR login
echo "Logging into ECR..."
wsl aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push Docker image
echo "Building Docker image..."
cd watermarker
docker build -t hatchmark-watermarker .

echo "Tagging and pushing image..."
docker tag hatchmark-watermarker:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest

cd ..

echo "✅ Docker image pushed successfully!"

# Phase 2: Deploy AWS Backend
echo ""
echo "🏗️ Phase 2: AWS Backend Deployment"
echo "=================================="

cd backend

echo "Building SAM application..."
wsl sam build --use-container

echo "Deploying to AWS..."
wsl sam deploy --config-env prod --parameter-overrides Environment=prod

echo "✅ AWS Backend deployed successfully!"

# Get the API Gateway URL
API_GATEWAY_URL=$(wsl aws cloudformation describe-stacks \
    --stack-name hatchmark-backend-prod \
    --query 'Stacks[0].Outputs[?OutputKey==`HttpApiUrl`].OutputValue' \
    --output text)

echo ""
echo "🌐 Deployment Complete!"
echo "======================"
echo "API Gateway URL: $API_GATEWAY_URL"
echo ""
echo "Next Steps:"
echo "1. Configure Vercel with this API Gateway URL:"
echo "   NEXT_PUBLIC_API_GATEWAY_URL=$API_GATEWAY_URL"
echo ""
echo "2. Set other Vercel environment variables:"
echo "   NEXT_PUBLIC_AWS_REGION=$AWS_REGION"
echo "   NEXT_PUBLIC_INGESTION_BUCKET=hatchmark-ingestion-prod-$AWS_ACCOUNT_ID"
echo "   NEXT_PUBLIC_PROCESSED_BUCKET=hatchmark-processed-prod-$AWS_ACCOUNT_ID"
echo ""
echo "3. Deploy your frontend to Vercel"
echo ""
echo "4. Test the complete workflow!"

cd ..
