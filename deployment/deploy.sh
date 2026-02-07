#!/bin/bash

# Hatchmark Deployment Script
# This script deploys the Hatchmark authenticity service to AWS

set -e  # Exit on any error

# Configuration
PROJECT_NAME="hatchmark"
ENVIRONMENT="dev"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Package Lambda functions
package_lambdas() {
    log_info "Packaging Lambda functions..."
    
    # Create deployment package directory
    mkdir -p deployment/lambda-packages
    
    # Package backend Lambda functions
    cd backend/src
    zip -r ../../deployment/lambda-packages/backend-functions.zip . -x "*.pyc" "__pycache__/*"
    cd ../..
    
    log_success "Lambda functions packaged"
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    log_info "Deploying infrastructure with CloudFormation..."
    
    aws cloudformation deploy \
        --template-file deployment/cloudformation-template.yaml \
        --stack-name $STACK_NAME \
        --parameter-overrides \
            ProjectName=$PROJECT_NAME \
            Environment=$ENVIRONMENT \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $AWS_REGION
    
    log_success "Infrastructure deployed successfully"
}

# Update Lambda function code
update_lambda_code() {
    log_info "Updating Lambda function code..."
    
    # Get function names from CloudFormation outputs
    GENERATE_URL_FUNCTION=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='GeneratePresignedUrlFunction'].OutputValue" \
        --output text --region $AWS_REGION 2>/dev/null || echo "${PROJECT_NAME}-generatePresignedUrl-${ENVIRONMENT}")
    
    COMPUTE_PHASH_FUNCTION=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='ComputePhashFunction'].OutputValue" \
        --output text --region $AWS_REGION 2>/dev/null || echo "${PROJECT_NAME}-computePhash-${ENVIRONMENT}")
    
    WRITE_LEDGER_FUNCTION=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='WriteToLedgerFunction'].OutputValue" \
        --output text --region $AWS_REGION 2>/dev/null || echo "${PROJECT_NAME}-writeToLedger-${ENVIRONMENT}")
    
    VERIFY_ARTWORK_FUNCTION=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='VerifyArtworkFunction'].OutputValue" \
        --output text --region $AWS_REGION 2>/dev/null || echo "${PROJECT_NAME}-verifyArtwork-${ENVIRONMENT}")
    
    # Update each Lambda function
    for func in $GENERATE_URL_FUNCTION $COMPUTE_PHASH_FUNCTION $WRITE_LEDGER_FUNCTION $VERIFY_ARTWORK_FUNCTION; do
        log_info "Updating Lambda function: $func"
        aws lambda update-function-code \
            --function-name $func \
            --zip-file fileb://deployment/lambda-packages/backend-functions.zip \
            --region $AWS_REGION
    done
    
    log_success "Lambda functions updated"
}

# Build and push Docker image for watermarker
deploy_watermarker() {
    log_info "Building and deploying watermarker container..."
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Create ECR repository if it doesn't exist
    ECR_REPO_NAME="${PROJECT_NAME}-watermarker"
    aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION >/dev/null 2>&1 || \
        aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build Docker image
    cd watermarker
    docker build -t $ECR_REPO_NAME .
    
    # Tag and push to ECR
    docker tag $ECR_REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:latest
    
    cd ..
    
    log_success "Watermarker container deployed to ECR"
}

# Setup QLDB tables
setup_qldb() {
    log_info "Setting up QLDB tables..."
    
    # Get ledger name
    LEDGER_NAME="${PROJECT_NAME}-ledger-${ENVIRONMENT}"
    
    # Note: QLDB table creation requires the pyqldb library
    # This would be done through a separate Python script or Lambda function
    log_warning "QLDB table creation should be done manually or through a separate script"
    log_info "Create table 'registrations' with index on 'perceptualHash' field"
}

# Get deployment outputs
get_outputs() {
    log_info "Getting deployment outputs..."
    
    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='APIGatewayURL'].OutputValue" \
        --output text --region $AWS_REGION 2>/dev/null)
    
    if [ ! -z "$API_URL" ]; then
        log_success "API Gateway URL: $API_URL"
        echo "Upload endpoint: $API_URL/generate-upload-url"
        echo "Verify endpoint: $API_URL/verify-artwork"
    fi
    
    # Get S3 bucket names
    INGESTION_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='IngestionBucketName'].OutputValue" \
        --output text --region $AWS_REGION 2>/dev/null)
    
    if [ ! -z "$INGESTION_BUCKET" ]; then
        log_success "Ingestion Bucket: $INGESTION_BUCKET"
    fi
}

# Main deployment flow
main() {
    log_info "Starting Hatchmark deployment..."
    log_info "Project: $PROJECT_NAME, Environment: $ENVIRONMENT, Region: $AWS_REGION"
    
    check_prerequisites
    package_lambdas
    deploy_infrastructure
    update_lambda_code
    deploy_watermarker
    setup_qldb
    get_outputs
    
    log_success "Deployment completed successfully!"
    log_info "Next steps:"
    echo "1. Set up QLDB tables manually"
    echo "2. Test the API endpoints"
    echo "3. Deploy the frontend application"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "infrastructure")
        check_prerequisites
        deploy_infrastructure
        ;;
    "lambdas")
        check_prerequisites
        package_lambdas
        update_lambda_code
        ;;
    "watermarker")
        check_prerequisites
        deploy_watermarker
        ;;
    "outputs")
        get_outputs
        ;;
    "help")
        echo "Usage: $0 [deploy|infrastructure|lambdas|watermarker|outputs|help]"
        echo ""
        echo "Commands:"
        echo "  deploy         - Full deployment (default)"
        echo "  infrastructure - Deploy only CloudFormation stack"
        echo "  lambdas        - Update only Lambda functions"
        echo "  watermarker    - Build and deploy watermarker container"
        echo "  outputs        - Show deployment outputs"
        echo "  help           - Show this help"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac