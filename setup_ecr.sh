#!/bin/bash

# Phase 4: ECR Repository Setup and Docker Image Push
# Replace [AWS_ACCOUNT_ID] and [REGION] with your actual values

set -e

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(wsl aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "🚀 Setting up ECR Repository for Hatchmark Watermarker"
echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"

# 1. Create ECR Repository
echo "📦 Creating ECR repository..."
wsl aws ecr create-repository \
    --repository-name hatchmark-watermarker \
    --image-scanning-configuration scanOnPush=true \
    --region $AWS_REGION || echo "Repository may already exist"

# 2. Get ECR login token and login Docker
echo "🔐 Logging Docker into ECR..."
wsl aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 3. Build Docker image
echo "🔨 Building Docker image..."
cd watermarker
docker build -t hatchmark-watermarker .

# 4. Tag image for ECR
echo "🏷️ Tagging image..."
docker tag hatchmark-watermarker:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest

# 5. Push image to ECR
echo "⬆️ Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest

echo "✅ Docker image successfully pushed to ECR!"
echo "Image URI: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest"

cd ..
