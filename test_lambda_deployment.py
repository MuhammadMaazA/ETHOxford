#!/usr/bin/env python3
"""
Test script for Lambda-based deployment (without API Gateway)
Tests individual Lambda functions and Vercel frontend
"""

import json
import sys
import time
import requests
from typing import Dict, Any, Optional

class LambdaDeploymentTester:
    def __init__(self, vercel_url: str):
        self.vercel_url = vercel_url.rstrip('/')
        self.test_results = []
        
        # Lambda function names from your deployment
        self.lambda_functions = {
            'generate_url': 'hatchmark-generate-url-dev',
            'register_asset': 'hatchmark-register-asset-dev', 
            'verify_artwork': 'hatchmark-verify-artwork-dev'
        }
        
        # AWS resources from your stack
        self.aws_resources = {
            'ingestion_bucket': 'hatchmark-ingestion-bucket-dev-581150859000',
            'processed_bucket': 'hatchmark-processed-bucket-dev-581150859000',
            'dynamodb_table': 'hatchmark-assets-dev',
            'sqs_queue': 'https://sqs.eu-west-1.amazonaws.com/581150859000/hatchmark-watermarking-dev'
        }
        
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

    def test_frontend_accessibility(self):
        """Test if the Vercel frontend is accessible"""
        try:
            response = requests.get(self.vercel_url, timeout=10)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'text/html' in content_type:
                    self.log_test(
                        "Frontend Accessibility", 
                        True, 
                        f"Frontend is accessible at {self.vercel_url}",
                        {"status_code": response.status_code}
                    )
                    return True
                else:
                    self.log_test(
                        "Frontend Accessibility", 
                        False, 
                        "Frontend returned non-HTML content",
                        {"content_type": content_type}
                    )
            else:
                self.log_test(
                    "Frontend Accessibility", 
                    False, 
                    f"Frontend returned status {response.status_code}"
                )
        except Exception as e:
            self.log_test(
                "Frontend Accessibility", 
                False, 
                f"Failed to connect to frontend: {str(e)}"
            )
        return False

    def test_lambda_functions(self):
        """Test Lambda function accessibility"""
        import subprocess
        
        for func_type, func_name in self.lambda_functions.items():
            try:
                # Test if Lambda function exists and is accessible
                result = subprocess.run([
                    'wsl', 'aws', 'lambda', 'get-function', 
                    '--function-name', func_name
                ], capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0:
                    self.log_test(
                        f"Lambda Function - {func_type}", 
                        True, 
                        f"Function {func_name} is accessible"
                    )
                else:
                    self.log_test(
                        f"Lambda Function - {func_type}", 
                        False, 
                        f"Function {func_name} not accessible",
                        {"error": result.stderr}
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Lambda Function - {func_type}", 
                    False, 
                    f"Error checking function {func_name}: {str(e)}"
                )

    def test_lambda_invocation(self):
        """Test actual Lambda function invocation"""
        import subprocess
        import tempfile
        
        # Test generate-url function
        try:
            payload = {"filename": "test-image.jpg"}
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(payload, f)
                payload_file = f.name
            
            result = subprocess.run([
                'wsl', 'aws', 'lambda', 'invoke',
                '--function-name', self.lambda_functions['generate_url'],
                '--payload', f'file://{payload_file}',
                '/tmp/response.json'
            ], capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0:
                # Read response
                with open('/tmp/response.json', 'r') as f:
                    response = json.load(f)
                
                if 'uploadUrl' in str(response):
                    self.log_test(
                        "Lambda Invocation - Generate URL", 
                        True, 
                        "Generate URL function working correctly"
                    )
                else:
                    self.log_test(
                        "Lambda Invocation - Generate URL", 
                        False, 
                        "Generate URL function returned unexpected response",
                        {"response": response}
                    )
            else:
                self.log_test(
                    "Lambda Invocation - Generate URL", 
                    False, 
                    "Failed to invoke Generate URL function",
                    {"error": result.stderr}
                )
                
        except Exception as e:
            self.log_test(
                "Lambda Invocation - Generate URL", 
                False, 
                f"Error testing Lambda invocation: {str(e)}"
            )

    def test_aws_resources(self):
        """Test AWS resources accessibility"""
        import subprocess
        
        # Test S3 buckets
        for bucket_type, bucket_name in [
            ('Ingestion Bucket', self.aws_resources['ingestion_bucket']),
            ('Processed Bucket', self.aws_resources['processed_bucket'])
        ]:
            try:
                result = subprocess.run([
                    'wsl', 'aws', 's3', 'ls', f's3://{bucket_name}/'
                ], capture_output=True, text=True, timeout=10)
                
                success = result.returncode == 0
                self.log_test(
                    f"AWS Resource - {bucket_type}", 
                    success, 
                    f"Bucket {bucket_name} is accessible" if success else f"Bucket {bucket_name} not accessible"
                )
                
            except Exception as e:
                self.log_test(
                    f"AWS Resource - {bucket_type}", 
                    False, 
                    f"Error checking bucket {bucket_name}: {str(e)}"
                )
        
        # Test DynamoDB table
        try:
            result = subprocess.run([
                'wsl', 'aws', 'dynamodb', 'describe-table',
                '--table-name', self.aws_resources['dynamodb_table']
            ], capture_output=True, text=True, timeout=10)
            
            success = result.returncode == 0
            self.log_test(
                "AWS Resource - DynamoDB Table", 
                success, 
                f"DynamoDB table {self.aws_resources['dynamodb_table']} is accessible" if success else "DynamoDB table not accessible"
            )
            
        except Exception as e:
            self.log_test(
                "AWS Resource - DynamoDB Table", 
                False, 
                f"Error checking DynamoDB table: {str(e)}"
            )

    def test_frontend_configuration(self):
        """Test if frontend is configured to work with Lambda functions"""
        try:
            response = requests.get(self.vercel_url, timeout=10)
            
            if response.status_code == 200:
                content = response.text
                
                # Check for signs of proper configuration
                has_app_content = 'hatchmark' in content.lower()
                has_react = 'react' in content.lower() or 'div' in content
                
                config_ok = has_app_content and has_react
                
                self.log_test(
                    "Frontend Configuration", 
                    config_ok, 
                    "Frontend appears properly configured" if config_ok else "Frontend may have configuration issues",
                    {
                        "has_app_content": has_app_content,
                        "has_react_elements": has_react
                    }
                )
                return config_ok
                
        except Exception as e:
            self.log_test(
                "Frontend Configuration", 
                False, 
                f"Error testing frontend configuration: {str(e)}"
            )
        return False

    def run_comprehensive_test(self):
        """Run all tests and provide a summary"""
        print(f"🚀 Testing Lambda-based Deployment")
        print(f"Frontend URL: {self.vercel_url}")
        print(f"AWS Region: eu-west-1 (detected from SQS URL)")
        print("=" * 60)
        
        # Run all tests
        self.test_frontend_accessibility()
        time.sleep(0.5)
        
        self.test_frontend_configuration()
        time.sleep(0.5)
        
        self.test_lambda_functions()
        time.sleep(0.5)
        
        self.test_lambda_invocation()
        time.sleep(0.5)
        
        self.test_aws_resources()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        
        if passed == total:
            print("🎉 All tests passed! Your deployment looks good!")
            return True
        elif passed >= total * 0.7:  # 70% pass rate
            print("✅ Most tests passed! Your deployment is mostly working.")
            print("⚠️  Check the failed tests for minor issues.")
        else:
            print("⚠️  Several tests failed. Your deployment needs attention.")
            
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print("\nFailed Tests:")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['message']}")
        
        return passed >= total * 0.7

def main():
    """Main function to run the tests"""
    if len(sys.argv) != 2:
        print("Usage: python test_lambda_deployment.py <vercel_url>")
        print("Example: python test_lambda_deployment.py https://your-app.vercel.app")
        sys.exit(1)
    
    vercel_url = sys.argv[1]
    
    if not vercel_url.startswith('https://'):
        print("❌ Vercel URL should start with https://")
        sys.exit(1)
    
    tester = LambdaDeploymentTester(vercel_url)
    success = tester.run_comprehensive_test()
    
    # Save results
    results_file = 'lambda_test_results.json'
    with open(results_file, 'w') as f:
        json.dump({
            'vercel_url': vercel_url,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'overall_success': success,
            'test_results': tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
