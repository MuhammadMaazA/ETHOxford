# Hatchmark Production Deployment Guide

## 🚀 Complete Setup for Vercel Frontend + AWS Backend

This guide will help you deploy your Hatchmark application with the frontend on Vercel and the backend on AWS, maintaining the same functionality you have locally.

## Prerequisites

1. **AWS CLI** installed and configured with your credentials
2. **SAM CLI** installed
3. **Docker** installed and running
4. **Vercel account** and CLI (optional)
5. **GitHub repository** connected to Vercel

## Step 1: Deploy AWS Backend

### 1.1 Run the Production Deployment Script

```bash
# Make sure you're in the project root
./deploy-production.sh
```

This script will:
- Build and deploy your SAM application to AWS
- Create all necessary resources (S3, DynamoDB, Lambda, API Gateway, etc.)
- Output the API Gateway URL and other important values

### 1.2 Alternative Manual Deployment

If you prefer to deploy manually:

```bash
cd backend
sam build --use-container
sam deploy --config-env prod --guided
```

## Step 2: Configure Vercel Environment Variables

After your AWS backend is deployed, you'll get output like this:

```
API Gateway URL: https://abc123.execute-api.us-east-1.amazonaws.com
Ingestion Bucket: hatchmark-ingestion-bucket-prod-123456789012
Processed Bucket: hatchmark-processed-bucket-prod-123456789012
```

### 2.1 Add Environment Variables in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables and add:

```
NEXT_PUBLIC_API_GATEWAY_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_INGESTION_BUCKET=your-ingestion-bucket-name
NEXT_PUBLIC_PROCESSED_BUCKET=your-processed-bucket-name
```

### 2.2 Alternative: Using Vercel CLI

```bash
cd frontend
vercel env add NEXT_PUBLIC_API_GATEWAY_URL
vercel env add NEXT_PUBLIC_AWS_REGION
vercel env add NEXT_PUBLIC_INGESTION_BUCKET
vercel env add NEXT_PUBLIC_PROCESSED_BUCKET
```

## Step 3: Deploy the Watermarker Container (Optional)

For the full watermarking functionality:

```bash
# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

# Create ECR repository
aws ecr create-repository --repository-name hatchmark-watermarker --image-scanning-configuration scanOnPush=true

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push the container
cd watermarker
docker build -t hatchmark-watermarker .
docker tag hatchmark-watermarker:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest
```

## Step 4: Deploy Frontend to Vercel

### 4.1 Automatic Deployment (Recommended)

1. Push your changes to GitHub
2. Vercel will automatically detect changes and redeploy
3. The new environment variables will be picked up automatically

### 4.2 Manual Deployment

```bash
cd frontend
vercel --prod
```

## Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Try uploading an image
3. Check that the upload goes to your AWS S3 bucket
4. Verify that the Lambda functions are triggered
5. Check that the processing workflow completes

## Environment Configuration Details

### Local Development
- Uses `http://localhost:3002` for API calls
- Uses local AWS credentials if configured
- Falls back to demo mode if AWS not configured

### Production (Vercel)
- Uses `NEXT_PUBLIC_API_GATEWAY_URL` for API calls
- Automatically detects Vercel environment
- Uses production AWS resources

## Troubleshooting

### CORS Issues
If you get CORS errors, check that your Vercel domain is allowed in the SAM template:

```yaml
HttpApi:
  CorsConfiguration:
    AllowOrigins: 
      - "https://your-vercel-domain.vercel.app"
```

### Environment Variables Not Loading
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding environment variables
- Check the Vercel build logs for any errors

### AWS Permissions
- Ensure your AWS credentials have sufficient permissions
- Check CloudFormation stack events for deployment issues
- Verify IAM roles and policies are correctly configured

## Architecture Overview

```
┌─────────────────┐    HTTPS    ┌──────────────────┐
│   Vercel        │────────────▶│  AWS API Gateway │
│   (Frontend)    │             │                  │
└─────────────────┘             └──────────────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │   Lambda         │
                                │   Functions      │
                                └──────────────────┘
                                         │
                        ┌────────────────┼────────────────┐
                        ▼                ▼                ▼
                ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                │   S3 Bucket  │ │   DynamoDB   │ │   SQS Queue  │
                │   (Storage)  │ │  (Database)  │ │ (Messages)   │
                └──────────────┘ └──────────────┘ └──────────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────┐
                                                 │   Fargate    │
                                                 │ (Watermarker)│
                                                 └──────────────┘
```

## Cost Optimization

- Lambda functions scale to zero when not in use
- Fargate tasks scale to zero when no messages in queue
- S3 and DynamoDB are pay-per-use
- Expected cost: < $5/month for moderate usage

## Security Features

- All S3 buckets are private with encryption enabled
- API Gateway has CORS protection
- Lambda functions have minimal IAM permissions
- Vercel deployment includes security headers

## Next Steps

1. Set up monitoring with CloudWatch
2. Configure alerts for errors and high costs
3. Set up automated backups for DynamoDB
4. Consider adding authentication with AWS Cognito
5. Implement caching with CloudFront

---

🎉 **Congratulations!** Your Hatchmark application is now running in production with a global frontend on Vercel and a serverless backend on AWS!
