# 🛡️ Hatchmark Digital Authenticity Platform

**Combat AI-generated misinformation with invisible watermarking technology**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MuhammadMaazA/hatchmark-authenticity-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![AWS SAM](https://img.shields.io/badge/AWS-SAM-orange)](https://aws.amazon.com/serverless/sam/)

## 🚀 Quick Deploy

**One-Click Deployment:** Click the "Deploy with Vercel" button above to instantly deploy the frontend.

**Full Documentation:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete setup instructions.

## Deployment Status: LIVE - PRODUCTION READY

A comprehensive, cloud-native service for proving digital content authenticity using invisible watermarking technology.

- **Frontend:** Next.js with TypeScript on Vercel Edge Network
- **Backend:** AWS SAM with serverless architecture  
- **Status:** Production Ready

### Quick Start

1. **Generate Upload URL:**
   ```bash
   aws lambda invoke --function-name hatchmark-generate-url-dev \
     --payload '{"file_name": "artwork.jpg"}' response.json
   ```

2. **Register Asset:**
   ```bash
   aws lambda invoke --function-name hatchmark-register-asset-dev \
     --payload '{"bucket": "BUCKET_NAME", "key": "artwork.jpg"}' response.json
   ```

3. **Verify Asset:**
   ```bash
   aws lambda invoke --function-name hatchmark-verify-artwork-dev \
     --payload '{"asset_id": "ASSET_ID"}' response.json
   ```

📋 **[View Complete Deployment Guide](./DEPLOYMENT_SUMMARY.md)**

---

## Project Vision

Hatchmark addresses the escalating challenge of digital content authenticity in the age of generative AI. Our mission is to provide creators with an accessible, robust tool to prove the origin and timestamp of their digital works through immutable "hatch marks" recorded on a quantum ledger database.

## Architecture Overview

- **Serverless-First**: Built on AWS Lambda, API Gateway, and Step Functions
- **Immutable Ledger**: Amazon DynamoDB with Point-in-Time Recovery for tamper-proof record keeping
- **Dual Verification**: Perceptual hashing + steganographic watermarking
- **Scalable Processing**: AWS Fargate for heavy watermarking tasks
- **Cost-Efficient**: Pay-per-use model with scale-to-zero capabilities

## Technology Stack

### Backend
- **AWS Lambda**: Serverless compute for API endpoints
- **Amazon DynamoDB**: NoSQL database with Point-in-Time Recovery for immutable records
- **AWS Step Functions**: Workflow orchestration
- **Amazon S3**: Object storage for original and processed images
- **AWS Fargate**: Containerized watermarking service
- **Amazon SQS**: Message queuing for decoupled processing

### Frontend
- **HTML5/CSS3/JavaScript**: Simple, responsive web interface
- **Drag & Drop API**: Modern file upload experience

### Watermarking
- **Python**: Core processing language
- **Pillow (PIL)**: Image manipulation
- **Steganography**: Invisible watermark embedding
- **ImageHash**: Perceptual hash computation

## Project Structure

```
hatchmark-authenticity-service/
├── backend/
│   └── src/
│       ├── handlers.py          # Lambda function handlers
│       └── requirements.txt     # Python dependencies
├── watermarker/
│   ├── main.py                 # Watermarking service
│   ├── Dockerfile              # Container definition
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── index.html              # Main web interface (Vite + React + Tailwind)
│   ├── src/                    # React source code
│   ├── public/                 # Static assets
│   └── ...                     # Modern frontend stack
├── deployment/
│   ├── cloudformation-template.yaml  # Infrastructure as Code
│   ├── deploy.sh                     # Deployment script
│   └── step-functions-workflow.json  # Step Functions definition
└── architecture/
    └── (architecture diagrams)
```

## Quick Start

### Prerequisites

1. **AWS Account** with programmatic access
2. **AWS CLI** configured with appropriate permissions
3. **Docker** for containerized services
4. **Python 3.11+** for local development

### Installation & Deployment

1. **Clone the repository**
   ```bash
   git clone https://github.com/MuhammadMaazA/hatchmark-authenticity-service.git
   cd hatchmark-authenticity-service
   ```

2. **Configure AWS credentials**
   ```bash
   aws configure
   ```

3. **Deploy the infrastructure**
   ```bash
   chmod +x deployment/deploy.sh
   ./deployment/deploy.sh
   ```

4. **Update frontend configuration**
   - Get API Gateway URL from deployment outputs
   - Update the API base URL in the appropriate config or environment file in `frontend` (see `.env` or Vite config if present)

5. **Test the service**
   - Run the frontend locally:
     ```bash
   cd frontend
     npm install
     npm run dev
     ```
   - Open the local development URL in your browser (see terminal output)
   - Try registering and verifying an image

## Development Phases

### Phase 0: Foundation & Setup

Everything needed to get started locally.

### Phase 1: The Ingestion Core (In Progress)

###  Phase 2: The Notarization Pipeline
- [x] DynamoDB table setup (replacing QLDB)
- [x] Perceptual hashing Lambda
- [x] Ledger-writing Lambda (now DynamoDB)
- [x] Step Functions orchestration

###  Phase 3: The Heavy Lifter
- [ ] Steganography implementation
- [ ] Container registry (ECR)
- [ ] Fargate task definition
- [ ] SQS integration

###  Phase 4: The Verification Endpoint
- [ ] Verification Lambda
- [ ] Verdict logic implementation
- [ ] API Gateway route

###  Phase 5: Frontend & UX
- [x] Basic UI framework
- [x] Register page
- [x] Verify page
- [ ] API integration testing

###  Phase 6: Pre-Launch & Polish
- [ ] Security audit
- [ ] Cost optimization
- [ ] Comprehensive documentation

## Security Features

- **Presigned URLs**: Secure, temporary file upload permissions
- **IAM Roles**: Principle of least privilege access
- **Private S3 Buckets**: No public access to stored images
- **Encrypted Storage**: Server-side encryption for all objects
- **HTTPS Only**: All API communications encrypted in transit

## Cost Management

- **Serverless Architecture**: Pay only for actual usage
- **Scale-to-Zero**: Fargate tasks scale down when idle
- **AWS Budgets**: Automated cost alerts and monitoring
- **Optimized Storage**: S3 lifecycle policies for cost control

## How It Works

### Registration Flow
1. User uploads image through web interface
2. Backend generates secure presigned URL for S3
3. Image uploaded directly to S3 bucket
4. Step Functions workflow triggered:
   - Compute perceptual hash
   - Write registration to DynamoDB
   - Queue watermarking task
5. Fargate container processes invisible watermark
6. Watermarked image stored in processed bucket

### Verification Flow
1. User uploads image for verification
2. System extracts watermark and computes hash
3. Queries DynamoDB for matching records
4. Returns verdict:
   - **Verified**: Watermark found and valid
   - **Potentially Altered**: Hash matches but no watermark
   - **Not Registered**: No matching records found

## Testing

### Local Testing
```bash
# Test watermarker locally
cd watermarker
docker build -t hatchmark-watermarker .
docker run hatchmark-watermarker

# Test Lambda functions locally (requires sam-cli)
sam local start-api
```

### API Testing
```bash
# Test upload URL generation
curl -X POST https://your-api-url/generate-upload-url \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.png"}'

# Test verification endpoint
curl -X POST https://your-api-url/verify-artwork \
  -F "file=@test-image.png"
```

## Monitoring & Observability

- **CloudWatch Logs**: Centralized logging for all services
- **CloudWatch Metrics**: Performance and cost monitoring
- **Step Functions Console**: Visual workflow execution tracking
- **DynamoDB Console**: Asset registry and transaction history

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions in GitHub Discussions

## Roadmap

### Next Features
- [ ] Multi-format support (video, audio, documents)
- [ ] User account management (Cognito integration)
- [ ] Public API for third-party integration
- [ ] Browser extension for web verification
- [ ] Mobile app for on-the-go verification

### Performance Goals
- [ ] < 60 seconds average notarization time
- [ ] < 2 seconds average verification time
- [ ] < $0.01 cost per transaction
- [ ] > 99.9% system reliability

---

