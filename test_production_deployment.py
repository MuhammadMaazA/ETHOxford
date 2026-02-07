#!/usr/bin/env python3
"""
Complete production deployment test for Hatchmark Authenticity Service
Tests the full workflow: Frontend -> API Gateway -> Lambda -> Step Functions -> Fargate -> S3
"""

import requests
import json
import time
import sys
import os
import subprocess
from typing import Dict, Any, Optional
from pathlib import Path

class ProductionDeploymentTester:
    def __init__(self, vercel_url: str, api_gateway_url: str):
        self.vercel_url = vercel_url.rstrip('/')
        self.api_gateway_url = api_gateway_url.rstrip('/')
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Optional[Dict] = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details or {}
        })
        
        if details and not success:
            print(f"   Details: {json.dumps(details, indent=2)}")

    def test_frontend_deployment(self):
        """Test Vercel frontend deployment"""
        try:
            response = requests.get(self.vercel_url, timeout=10)
            
            if response.status_code == 200:
                content = response.text.lower()
                
                # Check for key indicators
                has_hatchmark = 'hatchmark' in content
                has_react = any(indicator in content for indicator in ['react', '__next', 'next.js'])
                has_upload = any(word in content for word in ['upload', 'file', 'watermark'])
                
                all_present = has_hatchmark and has_react
                
                self.log_test(
                    "Frontend Deployment", 
                    all_present, 
                    "Frontend deployed and accessible" if all_present else "Frontend may have issues",
                    {
                        "has_hatchmark_branding": has_hatchmark,
                        "has_react_framework": has_react,
                        "has_upload_functionality": has_upload
                    }
                )
                return all_present
            else:
                self.log_test(
                    "Frontend Deployment", 
                    False, 
                    f"Frontend returned status {response.status_code}"
                )
        except Exception as e:
            self.log_test(
                "Frontend Deployment", 
                False, 
                f"Frontend not accessible: {str(e)}"
            )
        return False

    def test_api_gateway_deployment(self):
        """Test API Gateway deployment and CORS"""
        try:
            # Test CORS preflight
            cors_response = requests.options(
                f"{self.api_gateway_url}/uploads/initiate",
                headers={
                    'Origin': self.vercel_url,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                },
                timeout=10
            )
            
            cors_ok = cors_response.status_code in [200, 204]
            cors_headers = {
                'allow_origin': cors_response.headers.get('access-control-allow-origin'),
                'allow_methods': cors_response.headers.get('access-control-allow-methods'),
                'allow_headers': cors_response.headers.get('access-control-allow-headers')
            }
            
            self.log_test(
                "API Gateway CORS", 
                cors_ok, 
                "CORS configured correctly" if cors_ok else "CORS configuration issues",
                cors_headers
            )
            
            return cors_ok
            
        except Exception as e:
            self.log_test(
                "API Gateway CORS", 
                False, 
                f"CORS test failed: {str(e)}"
            )
            return False

    def test_upload_initiation_endpoint(self):
        """Test upload initiation endpoint"""
        try:
            payload = {"filename": "test-production-image.jpg"}
            
            response = requests.post(
                f"{self.api_gateway_url}/uploads/initiate",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['uploadUrl', 'objectKey']
                
                if all(field in data for field in required_fields):
                    # Validate S3 URL format
                    upload_url = data['uploadUrl']
                    is_s3_url = 's3.amazonaws.com' in upload_url or '.s3.' in upload_url
                    
                    self.log_test(
                        "Upload Initiation Endpoint", 
                        is_s3_url, 
                        "Upload initiation working with valid S3 URL" if is_s3_url else "Upload URL format invalid",
                        {
                            "object_key": data.get('objectKey'),
                            "upload_url_valid": is_s3_url
                        }
                    )
                    return data if is_s3_url else None
                else:
                    self.log_test(
                        "Upload Initiation Endpoint", 
                        False, 
                        "Response missing required fields",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Upload Initiation Endpoint", 
                    False, 
                    f"Upload initiation failed with status {response.status_code}",
                    {"response_text": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Upload Initiation Endpoint", 
                False, 
                f"Upload initiation test failed: {str(e)}"
            )
        
        return None

    def test_s3_upload(self, upload_data):
        """Test direct S3 upload using presigned URL"""
        if not upload_data:
            return False
            
        try:
            # Create a test image file
            test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\xcc\xdb\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
            
            response = requests.put(
                upload_data['uploadUrl'],
                data=test_image_data,
                headers={'Content-Type': 'image/png'},
                timeout=30
            )
            
            success = response.status_code == 200
            
            self.log_test(
                "S3 Direct Upload", 
                success, 
                "Direct S3 upload successful" if success else f"S3 upload failed with status {response.status_code}",
                {
                    "status_code": response.status_code,
                    "object_key": upload_data.get('objectKey')
                }
            )
            
            return success
            
        except Exception as e:
            self.log_test(
                "S3 Direct Upload", 
                False, 
                f"S3 upload test failed: {str(e)}"
            )
            return False

    def test_verification_endpoint(self):
        """Test verification endpoint"""
        try:
            # Create a small test file
            test_data = b'test image data for verification'
            files = {'file': ('test.jpg', test_data, 'image/jpeg')}
            
            response = requests.post(
                f"{self.api_gateway_url}/verify",
                files=files,
                timeout=30
            )
            
            # Even if verification fails (no watermark), endpoint should respond properly
            success = response.status_code in [200, 400, 404]
            
            self.log_test(
                "Verification Endpoint", 
                success, 
                "Verification endpoint responding correctly" if success else f"Verification endpoint error: {response.status_code}",
                {"status_code": response.status_code}
            )
            
            return success
            
        except Exception as e:
            self.log_test(
                "Verification Endpoint", 
                False, 
                f"Verification test failed: {str(e)}"
            )
            return False

    def test_duplicate_check_endpoint(self):
        """Test duplicate check endpoint"""
        try:
            # Create a small test file
            test_data = b'test image data for duplicate check'
            files = {'file': ('test.jpg', test_data, 'image/jpeg')}
            
            response = requests.post(
                f"{self.api_gateway_url}/uploads/check-duplicate",
                files=files,
                timeout=30
            )
            
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_required_fields = 'isDuplicate' in data and 'perceptualHash' in data
                success = has_required_fields
            
            self.log_test(
                "Duplicate Check Endpoint", 
                success, 
                "Duplicate check working correctly" if success else "Duplicate check endpoint issues",
                {"status_code": response.status_code}
            )
            
            return success
            
        except Exception as e:
            self.log_test(
                "Duplicate Check Endpoint", 
                False, 
                f"Duplicate check test failed: {str(e)}"
            )
            return False

    def test_aws_resources(self):
        """Test AWS resources availability"""
        try:
            # Test CloudFormation stack
            result = subprocess.run([
                'wsl', 'aws', 'cloudformation', 'describe-stacks', 
                '--stack-name', 'hatchmark-backend-prod'
            ], capture_output=True, text=True, timeout=10)
            
            stack_exists = result.returncode == 0
            
            self.log_test(
                "AWS CloudFormation Stack", 
                stack_exists, 
                "CloudFormation stack deployed successfully" if stack_exists else "CloudFormation stack not found"
            )
            
            if stack_exists:
                # Test individual resources
                self.test_s3_buckets()
                self.test_dynamodb_table()
                self.test_sqs_queue()
                self.test_fargate_service()
            
            return stack_exists
            
        except Exception as e:
            self.log_test(
                "AWS CloudFormation Stack", 
                False, 
                f"Stack test failed: {str(e)}"
            )
            return False

    def test_s3_buckets(self):
        """Test S3 buckets"""
        try:
            # Get account ID
            account_result = subprocess.run([
                'wsl', 'aws', 'sts', 'get-caller-identity', 
                '--query', 'Account', '--output', 'text'
            ], capture_output=True, text=True, timeout=5)
            
            if account_result.returncode == 0:
                account_id = account_result.stdout.strip()
                
                buckets = [
                    f'hatchmark-ingestion-prod-{account_id}',
                    f'hatchmark-processed-prod-{account_id}'
                ]
                
                for bucket_name in buckets:
                    bucket_result = subprocess.run([
                        'wsl', 'aws', 's3', 'ls', f's3://{bucket_name}/'
                    ], capture_output=True, text=True, timeout=10)
                    
                    bucket_exists = bucket_result.returncode == 0
                    bucket_type = 'Ingestion' if 'ingestion' in bucket_name else 'Processed'
                    
                    self.log_test(
                        f"S3 {bucket_type} Bucket", 
                        bucket_exists, 
                        f"{bucket_type} bucket accessible" if bucket_exists else f"{bucket_type} bucket not accessible"
                    )
                    
        except Exception as e:
            self.log_test(
                "S3 Buckets", 
                False, 
                f"S3 bucket test failed: {str(e)}"
            )

    def test_dynamodb_table(self):
        """Test DynamoDB table"""
        try:
            result = subprocess.run([
                'wsl', 'aws', 'dynamodb', 'describe-table',
                '--table-name', 'hatchmark-assets-prod'
            ], capture_output=True, text=True, timeout=10)
            
            table_exists = result.returncode == 0
            
            self.log_test(
                "DynamoDB Assets Table", 
                table_exists, 
                "DynamoDB table accessible" if table_exists else "DynamoDB table not accessible"
            )
            
        except Exception as e:
            self.log_test(
                "DynamoDB Assets Table", 
                False, 
                f"DynamoDB test failed: {str(e)}"
            )

    def test_sqs_queue(self):
        """Test SQS queue"""
        try:
            result = subprocess.run([
                'wsl', 'aws', 'sqs', 'get-queue-attributes',
                '--queue-url', 'https://sqs.eu-west-1.amazonaws.com/581150859000/hatchmark-watermarking-prod'
            ], capture_output=True, text=True, timeout=10)
            
            queue_exists = result.returncode == 0
            
            self.log_test(
                "SQS Watermarking Queue", 
                queue_exists, 
                "SQS queue accessible" if queue_exists else "SQS queue not accessible"
            )
            
        except Exception as e:
            self.log_test(
                "SQS Watermarking Queue", 
                False, 
                f"SQS test failed: {str(e)}"
            )

    def test_fargate_service(self):
        """Test Fargate service"""
        try:
            result = subprocess.run([
                'wsl', 'aws', 'ecs', 'describe-services',
                '--cluster', 'hatchmark-cluster-prod',
                '--services', 'hatchmark-watermarker-prod'
            ], capture_output=True, text=True, timeout=10)
            
            service_exists = result.returncode == 0
            
            self.log_test(
                "Fargate Watermarker Service", 
                service_exists, 
                "Fargate service configured" if service_exists else "Fargate service not found"
            )
            
        except Exception as e:
            self.log_test(
                "Fargate Watermarker Service", 
                False, 
                f"Fargate test failed: {str(e)}"
            )

    def run_comprehensive_test(self):
        """Run all tests and provide a comprehensive report"""
        print(f"🚀 Testing Complete Production Deployment")
        print(f"Frontend URL: {self.vercel_url}")
        print(f"API Gateway URL: {self.api_gateway_url}")
        print("=" * 80)
        
        # Phase 1: Frontend Tests
        print("\n📱 Phase 1: Frontend Deployment Tests")
        print("-" * 40)
        self.test_frontend_deployment()
        time.sleep(1)
        
        # Phase 2: API Gateway Tests
        print("\n🌐 Phase 2: API Gateway Tests")
        print("-" * 40)
        cors_ok = self.test_api_gateway_deployment()
        time.sleep(1)
        
        upload_data = self.test_upload_initiation_endpoint()
        time.sleep(1)
        
        if upload_data:
            self.test_s3_upload(upload_data)
            time.sleep(1)
        
        self.test_verification_endpoint()
        time.sleep(1)
        
        self.test_duplicate_check_endpoint()
        time.sleep(1)
        
        # Phase 3: AWS Infrastructure Tests
        print("\n☁️ Phase 3: AWS Infrastructure Tests")
        print("-" * 40)
        self.test_aws_resources()
        
        # Generate comprehensive report
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        pass_rate = (passed / total) * 100 if total > 0 else 0
        
        print(f"Tests Passed: {passed}/{total} ({pass_rate:.1f}%)")
        
        if pass_rate >= 90:
            print("🎉 EXCELLENT! Your production deployment is working perfectly!")
            status = "excellent"
        elif pass_rate >= 75:
            print("✅ GOOD! Your deployment is mostly working with minor issues.")
            status = "good"
        elif pass_rate >= 50:
            print("⚠️  NEEDS ATTENTION! Several components need fixing.")
            status = "needs_attention"
        else:
            print("❌ CRITICAL ISSUES! Major deployment problems detected.")
            status = "critical"
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['message']}")
        
        # Show recommendations
        print(f"\n💡 Recommendations:")
        if not cors_ok:
            print("  • Fix CORS configuration in API Gateway")
        if any('S3' in test['test'] for test in failed_tests):
            print("  • Check S3 bucket permissions and CORS settings")
        if any('Fargate' in test['test'] for test in failed_tests):
            print("  • Verify Fargate service deployment and Docker image")
        if pass_rate < 100:
            print("  • Review CloudWatch logs for detailed error information")
            print("  • Ensure all environment variables are properly set")
        
        return status == "excellent" or status == "good"

def main():
    """Main function"""
    if len(sys.argv) != 3:
        print("Usage: python test_production_deployment.py <vercel_url> <api_gateway_url>")
        print("Example: python test_production_deployment.py https://your-app.vercel.app https://api-id.execute-api.eu-west-1.amazonaws.com")
        sys.exit(1)
    
    vercel_url = sys.argv[1]
    api_gateway_url = sys.argv[2]
    
    tester = ProductionDeploymentTester(vercel_url, api_gateway_url)
    success = tester.run_comprehensive_test()
    
    # Save detailed results
    results_file = 'production_test_results.json'
    with open(results_file, 'w') as f:
        json.dump({
            'vercel_url': vercel_url,
            'api_gateway_url': api_gateway_url,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'overall_success': success,
            'test_results': tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
