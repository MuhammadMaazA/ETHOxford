# Hatchmark Implementation Guide

This comprehensive guide will walk you through implementing the Hatchmark Digital Authenticity Service from start to finish.

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **AWS Account** with billing enabled
- [ ] **AWS CLI** installed and configured
- [ ] **Docker Desktop** installed and running
- [ ] **Python 3.11+** installed
- [ ] **Git** for version control
- [ ] **Code editor** (VS Code recommended)

## 🔧 Initial Setup

### 1. Clone and Prepare the Project

```bash
# Clone the repository
git clone https://github.com/your-username/hatchmark-authenticity-service.git
cd hatchmark-authenticity-service

# Make deployment script executable
chmod +x deployment/deploy.sh
chmod +x scripts/setup_qldb.py
chmod +x tests/test_local.py
```

### 2. Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp config/environment.env.example config/environment.env

# Edit with your actual values
nano config/environment.env
```

Update the following key values:
- `AWS_ACCOUNT_ID`: Your AWS account ID
- `AWS_REGION`: Your preferred region (default: us-east-1)
- `PROJECT_NAME`: Keep as 'hatchmark' or customize
- `ENVIRONMENT`: dev, staging, or prod

## 🏗️ Phase-by-Phase Implementation

### Phase 1: Core Infrastructure Deployment

#### Step 1.1: Deploy Base Infrastructure

```bash
# Deploy the CloudFormation stack
./deployment/deploy.sh infrastructure
```

This creates:
- S3 buckets for ingestion and processed images
- Lambda functions (placeholder code)
- API Gateway with CORS configuration
- IAM roles with appropriate permissions
- SQS queue for watermarking tasks

#### Step 1.2: Update Lambda Function Code

```bash
# Package and deploy Lambda functions
./deployment/deploy.sh lambdas
```

#### Step 1.3: Test Basic Upload Flow

```bash
# Run local tests
python tests/test_local.py

# Test API endpoints
curl -X POST https://your-api-gateway-url/generate-upload-url \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.png"}'
```

### Phase 2: QLDB Setup and Notarization Pipeline

#### Step 2.1: Install QLDB Dependencies

```bash
# Install Python QLDB library
pip install pyqldb amazon-ion

# Or add to backend requirements
echo "pyqldb>=3.2.3" >> backend/src/requirements.txt
echo "amazon-ion>=0.9.3" >> backend/src/requirements.txt
```

#### Step 2.2: Create and Configure QLDB Ledger

```bash
# Run QLDB setup script
python scripts/setup_qldb.py
```

This script:
- Creates the QLDB ledger
- Sets up the `registrations` table
- Creates indexes for efficient querying
- Inserts sample data for testing

#### Step 2.3: Implement Perceptual Hashing

Update `backend/src/handlers.py` to include real perceptual hashing:

```python
import imagehash
from PIL import Image
import io

def compute_phash(event, context):
    try:
        # Parse S3 event
        s3_event = event['Records'][0]['s3']
        bucket_name = s3_event['bucket']['name']
        object_key = s3_event['object']['key']
        
        # Download image from S3
        s3_client = boto3.client('s3')
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        image_data = response['Body'].read()
        
        # Compute perceptual hash
        image = Image.open(io.BytesIO(image_data))
        phash = str(imagehash.phash(image))
        
        return {
            'statusCode': 200,
            'body': {
                'bucketName': bucket_name,
                'objectKey': object_key,
                'perceptualHash': phash,
                'timestamp': datetime.utcnow().isoformat(),
                'imageSize': image.size,
                'imageMode': image.mode
            }
        }
    except Exception as e:
        print(f"Error computing phash: {str(e)}")
        raise e
```

#### Step 2.4: Implement QLDB Writing

Update the `write_to_ledger` function:

```python
from pyqldb.driver.qldb_driver import QldbDriver

def write_to_ledger(event, context):
    try:
        # Extract data from previous step
        input_data = event
        
        # Prepare registration document
        registration_doc = {
            'creatorId': 'anonymous',  # Will be updated when auth is added
            'timestamp': input_data.get('timestamp'),
            'originalFilename': input_data.get('originalFilename', 'unknown'),
            's3IngestionKey': input_data.get('objectKey'),
            'perceptualHash': input_data.get('perceptualHash'),
            'hashAlgorithm': 'pHash',
            'status': 'REGISTERED'
        }
        
        # Write to QLDB
        driver = QldbDriver(os.environ.get('QLDB_LEDGER_NAME'))
        
        def insert_registration(txn):
            statement = "INSERT INTO registrations ?"
            cursor = txn.execute_statement(statement, registration_doc)
            result = list(cursor)
            return result[0]['documentId'] if result else None
        
        transaction_id = driver.execute_lambda(insert_registration)
        driver.close()
        
        return {
            'statusCode': 200,
            'body': {
                'transactionId': transaction_id,
                **registration_doc
            }
        }
    except Exception as e:
        print(f"Error writing to ledger: {str(e)}")
        raise e
```

#### Step 2.5: Deploy Step Functions Workflow

```bash
# Create Step Functions state machine using AWS CLI
aws stepfunctions create-state-machine \
  --name "HatchmarkNotarizationPipeline" \
  --definition file://deployment/step-functions-workflow.json \
  --role-arn "arn:aws:iam::YOUR-ACCOUNT:role/StepFunctionsExecutionRole"
```

### Phase 3: Watermarking Service (Fargate)

#### Step 3.1: Test Watermarker Locally

```bash
# Test the watermarker container locally
cd watermarker
docker build -t hatchmark-watermarker .
docker run --rm hatchmark-watermarker
```

#### Step 3.2: Deploy to ECR and Fargate

```bash
# Build and push to ECR, create Fargate service
./deployment/deploy.sh watermarker
```

#### Step 3.3: Configure Auto-scaling

Update the Fargate service to scale based on SQS queue length:

```bash
# Set up CloudWatch alarm and auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id "service/hatchmark-cluster/hatchmark-watermarker-service" \
  --scalable-dimension "ecs:service:DesiredCount" \
  --min-capacity 0 \
  --max-capacity 5

aws application-autoscaling put-scaling-policy \
  --policy-name "hatchmark-sqs-scaling-policy" \
  --service-namespace ecs \
  --resource-id "service/hatchmark-cluster/hatchmark-watermarker-service" \
  --scalable-dimension "ecs:service:DesiredCount" \
  --policy-type "TargetTrackingScaling"
```

### Phase 4: Verification Endpoint

#### Step 4.1: Implement Verification Logic

Update the `verify_artwork` function in `handlers.py`:

```python
def verify_artwork(event, context):
    try:
        # Parse uploaded file (base64 encoded in API Gateway)
        body = json.loads(event.get('body', '{}'))
        
        # Decode and process image
        image_data = base64.b64decode(body['file'])
        image = Image.open(io.BytesIO(image_data))
        
        # Compute perceptual hash
        phash = str(imagehash.phash(image))
        
        # Try to extract watermark
        watermark = extract_watermark_from_image(image)
        
        # Query QLDB
        driver = QldbDriver(os.environ.get('QLDB_LEDGER_NAME'))
        
        verdict = "NOT_REGISTERED"
        details = None
        
        if watermark:
            # Perfect match - watermark found
            def query_by_transaction_id(txn):
                statement = "SELECT * FROM registrations WHERE documentId = ?"
                cursor = txn.execute_statement(statement, watermark)
                return list(cursor)
            
            results = driver.execute_lambda(query_by_transaction_id)
            if results:
                verdict = "VERIFIED"
                details = results[0]
        else:
            # Check for visual similarity
            def query_by_hash(txn):
                statement = "SELECT * FROM registrations WHERE perceptualHash = ?"
                cursor = txn.execute_statement(statement, phash)
                return list(cursor)
            
            results = driver.execute_lambda(query_by_hash)
            if results:
                verdict = "POTENTIALLY_ALTERED"
                details = results[0]
        
        driver.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'verdict': verdict,
                'confidence': 100 if verdict == "VERIFIED" else 80,
                'details': details
            })
        }
    except Exception as e:
        print(f"Error in verification: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Verification failed'})
        }
```

### Phase 5: Frontend Integration

#### Step 5.1: Update API Configuration

Edit `frontend/script.js` to update the API base URL:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-actual-api-gateway-url.execute-api.us-east-1.amazonaws.com',
    // ... rest of configuration
};
```

#### Step 5.2: Deploy Frontend

Option A: S3 Static Website
```bash
# Create S3 bucket for frontend
aws s3 mb s3://hatchmark-frontend-bucket

# Upload frontend files
aws s3 sync frontend/ s3://hatchmark-frontend-bucket --acl public-read

# Configure static website hosting
aws s3 website s3://hatchmark-frontend-bucket --index-document index.html
```

Option B: Local Development
```bash
# Serve locally for testing
cd frontend
python -m http.server 8000
# Open http://localhost:8000
```

### Phase 6: Testing and Optimization

#### Step 6.1: End-to-End Testing

```bash
# Run comprehensive tests
python tests/test_local.py

# Test API endpoints
curl -X POST https://your-api-url/generate-upload-url \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.png"}'

# Test file upload flow using frontend
```

#### Step 6.2: Set Up Monitoring

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "HatchmarkMonitoring" \
  --dashboard-body file://monitoring/dashboard.json

# Set up cost alerts
aws budgets create-budget \
  --account-id YOUR-ACCOUNT-ID \
  --budget file://monitoring/budget.json
```

## 🔍 Troubleshooting Common Issues

### Lambda Function Issues

**Problem**: Lambda function timeout
```bash
# Increase timeout and memory
aws lambda update-function-configuration \
  --function-name hatchmark-computePhash-dev \
  --timeout 300 \
  --memory-size 1024
```

**Problem**: Missing dependencies
```bash
# Install dependencies in a Lambda layer
pip install -t ./layer/python imagehash pillow
cd layer && zip -r ../layer.zip .
aws lambda publish-layer-version \
  --layer-name hatchmark-dependencies \
  --zip-file fileb://layer.zip \
  --compatible-runtimes python3.11
```

### QLDB Issues

**Problem**: Access denied to QLDB
- Check IAM role permissions include `qldb:SendCommand`
- Verify the ledger exists and is in ACTIVE state

**Problem**: Table not found
```bash
# Re-run QLDB setup
python scripts/setup_qldb.py
```

### Fargate Issues

**Problem**: Container fails to start
- Check CloudWatch logs for the task
- Verify ECR image exists and permissions are correct
- Ensure SQS_QUEUE_URL environment variable is set

### Frontend Issues

**Problem**: CORS errors
- Verify API Gateway CORS configuration
- Check that frontend is using HTTPS for API calls

## 📊 Performance Optimization

### Cost Optimization

1. **Lambda Memory Tuning**
   ```bash
   # Monitor and adjust Lambda memory for cost/performance balance
   aws logs filter-log-events \
     --log-group-name "/aws/lambda/hatchmark-computePhash-dev" \
     --filter-pattern "REPORT" \
     --start-time 1672531200000
   ```

2. **S3 Lifecycle Policies**
   ```bash
   # Archive old images to cheaper storage classes
   aws s3api put-bucket-lifecycle-configuration \
     --bucket hatchmark-ingestion-bucket-dev \
     --lifecycle-configuration file://config/s3-lifecycle.json
   ```

3. **QLDB Optimization**
   - Use indexes effectively
   - Batch queries when possible
   - Archive old records to S3 for long-term storage

### Performance Tuning

1. **API Response Times**
   - Enable CloudFront for frontend assets
   - Use API Gateway caching for verification results
   - Optimize Lambda cold starts with provisioned concurrency

2. **Watermarking Speed**
   - Increase Fargate task CPU/memory
   - Implement batch processing for multiple images
   - Use GPU-enabled instances for complex algorithms

## 🔐 Security Hardening

### Production Security Checklist

- [ ] Enable AWS CloudTrail for audit logging
- [ ] Implement AWS WAF for API protection
- [ ] Use AWS Secrets Manager for sensitive configuration
- [ ] Enable VPC for Lambda functions
- [ ] Implement API rate limiting
- [ ] Add authentication with Amazon Cognito
- [ ] Enable S3 bucket notifications for security monitoring
- [ ] Implement data encryption at rest and in transit

## Deployment to Production

### Pre-Production Checklist

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Cost analysis approved
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery plan
- [ ] Documentation updated

### Production Deployment

```bash
# Deploy to production environment
ENVIRONMENT=prod ./deployment/deploy.sh

# Update DNS records (if using custom domain)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns/production-records.json

# Enable CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://config/cloudfront-config.json
```

## 📈 Monitoring and Maintenance

### Key Metrics to Monitor

1. **Functional Metrics**
   - Registration success rate
   - Verification accuracy
   - Average processing time

2. **Performance Metrics**
   - API response times
   - Lambda execution duration
   - Fargate task utilization

3. **Cost Metrics**
   - Monthly AWS spend
   - Cost per transaction
   - Resource utilization efficiency

### Regular Maintenance Tasks

- Weekly: Review CloudWatch logs and metrics
- Monthly: Analyze costs and optimize resources
- Quarterly: Security audit and dependency updates
- Annually: Architecture review and capacity planning

## 🎯 Next Steps and Future Features

### Immediate Enhancements
- User authentication with Amazon Cognito
- Batch processing for multiple files
- Mobile-responsive frontend improvements

### Advanced Features
- Video and audio watermarking
- Blockchain integration for public verification
- Machine learning for deepfake detection
- Browser extension for web-based verification

### Scaling Considerations
- Multi-region deployment
- CDN integration for global performance
- Database sharding for high volume
- Microservices architecture for complex workflows

---

**Need Help?** 
- Check the troubleshooting section above
- Review AWS documentation for specific services
- Submit issues on GitHub
- Join our community discussions

**Ready to deploy?** Start with Phase 1 and work through each phase systematically. Good luck with your Hatchmark implementation!