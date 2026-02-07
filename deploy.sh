#!/bin/bash

echo "Hatchmark Deployment Script"
echo "================================"

# Set up environment
export AWS_PROFILE=hatchmark-dev
cd /home/mmaaz/projects/hatchmark/hatchmark-authenticity-service

# Activate virtual environment
source .venv/bin/activate

echo "Building SAM application..."
cd backend
sam build --use-container

echo "Deploying SAM application..."
sam deploy --guided --profile hatchmark-dev

echo "Deployment complete!"
