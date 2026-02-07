#!/bin/bash

# Hatchmark AWS Setup and Test Deployment
# This script guides you through setting up AWS credentials and testing deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=============================================="
echo "🚀 Hatchmark AWS Setup and Deployment Guide"
echo "=============================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed."
    log_info "Please install AWS CLI first:"
    echo "  - Ubuntu/Debian: sudo apt install awscli"
    echo "  - macOS: brew install awscli"
    echo "  - Or follow: https://aws.amazon.com/cli/"
    exit 1
fi

log_success "AWS CLI is installed: $(aws --version)"

# Check if credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_warning "AWS credentials are not configured."
    log_info "You need to configure AWS credentials with the following permissions:"
    echo ""
    echo "Required AWS Services:"
    echo "  ✓ S3 - Object storage for images"
    echo "  ✓ DynamoDB - Asset registry database"
    echo "  ✓ Lambda - Serverless compute"
    echo "  ✓ Step Functions - Workflow orchestration"
    echo "  ✓ SQS - Message queuing"
    echo "  ✓ ECS/Fargate - Containerized watermarking"
    echo "  ✓ CloudFormation - Infrastructure deployment"
    echo ""
    log_info "To configure AWS credentials, run:"
    echo "  aws configure"
    echo ""
    echo "You'll need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region (e.g., us-east-1)"
    echo "  - Default output format (json)"
    echo ""
    log_warning "Make sure your AWS user has sufficient permissions for the above services."
    exit 1
fi

# Get current AWS identity
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
REGION=$(aws configure get region || echo "us-east-1")

log_success "AWS credentials are configured!"
echo "  Account ID: $ACCOUNT_ID"
echo "  User/Role: $USER_ARN"
echo "  Region: $REGION"
echo ""

# Check current implementation status
log_info "Checking implementation status..."

# Check if local dev server is running
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    log_success "Local development server is running on port 3002"
    
    # Test API endpoints
    log_info "Testing local API endpoints..."
    
    # Test health endpoint
    HEALTH_STATUS=$(curl -s http://localhost:3002/health | jq -r '.status' 2>/dev/null || echo "error")
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        log_success "✓ Health endpoint working"
    else
        log_warning "✗ Health endpoint not responding correctly"
    fi
    
    # Test upload initiation
    UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3002/uploads/initiate \
        -H "Content-Type: application/json" \
        -d '{"filename": "test.jpg", "contentType": "image/jpeg"}' || echo "error")
    
    if echo "$UPLOAD_RESPONSE" | jq -e '.uploadUrl' > /dev/null 2>&1; then
        log_success "✓ Upload initiation endpoint working"
    else
        log_warning "✗ Upload initiation endpoint not working"
    fi
    
else
    log_warning "Local development server is not running."
    log_info "Start it with: ./start-both-servers.sh"
fi

echo ""
log_info "Current Implementation Status:"
echo ""
echo "✅ COMPLETED:"
echo "   • Local Flask development server (Python)"
echo "   • React frontend with TypeScript"
echo "   • Perceptual hash-based image verification"
echo "   • Duplicate detection system"
echo "   • QR code certificate generation"
echo "   • Local file storage and processing"
echo ""
echo "🚧 READY FOR AWS DEPLOYMENT:"
echo "   • CloudFormation infrastructure template"
echo "   • Lambda function handlers with DynamoDB"
echo "   • Step Functions workflow definition"
echo "   • Containerized watermarking service"
echo "   • S3 bucket configuration"
echo "   • SQS queue for async processing"
echo ""
echo "🎯 NEXT STEPS:"
echo "   1. Deploy AWS infrastructure: ./deployment/deploy.sh"
echo "   2. Update frontend to use AWS API Gateway URLs"
echo "   3. Test end-to-end cloud workflow"
echo "   4. Enable steganographic watermarking"
echo ""

# Offer to start deployment
echo ""
read -p "Would you like to deploy the AWS infrastructure now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Starting AWS deployment..."
    chmod +x ./deployment/deploy.sh
    ./deployment/deploy.sh
else
    log_info "Deployment skipped. You can run it later with:"
    echo "  chmod +x ./deployment/deploy.sh"
    echo "  ./deployment/deploy.sh"
fi

echo ""
log_success "Setup check complete!"
