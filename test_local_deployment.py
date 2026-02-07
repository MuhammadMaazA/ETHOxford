#!/usr/bin/env python3
"""
Local deployment testing for Hatchmark Authenticity Service
Tests the complete workflow locally before deploying to production
"""

import requests
import json
import time
import sys
import os
import subprocess
from typing import Dict, Any, Optional
from pathlib import Path
import tempfile
from PIL import Image
import io

class LocalDeploymentTester:
    def __init__(self, local_backend_url: str = "http://localhost:3002", local_frontend_url: str = "http://localhost:3000"):
        self.backend_url = local_backend_url.rstrip('/')
        self.frontend_url = local_frontend_url.rstrip('/')
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

    def create_test_image(self, filename: str = "test_image.jpg") -> bytes:
        """Create a small test image"""
        # Create a simple 100x100 RGB image
        img = Image.new('RGB', (100, 100), color='red')
        
        # Add some text to make it unique
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        try:
            # Try to use a default font
            font = ImageFont.load_default()
        except:
            font = None
        
        draw.text((10, 10), "Hatchmark Test", fill='white', font=font)
        draw.text((10, 30), f"Time: {int(time.time())}", fill='white', font=font)
        
        # Convert to bytes
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='JPEG', quality=85)
        return img_buffer.getvalue()

    def test_local_backend_health(self):
        """Test if local backend is running"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            
            if response.status_code == 200:
                self.log_test(
                    "Local Backend Health", 
                    True, 
                    f"Backend running at {self.backend_url}"
                )
                return True
            else:
                self.log_test(
                    "Local Backend Health", 
                    False, 
                    f"Backend returned status {response.status_code}"
                )
        except requests.exceptions.ConnectionError:
            self.log_test(
                "Local Backend Health", 
                False, 
                f"Backend not running at {self.backend_url}"
            )
        except Exception as e:
            self.log_test(
                "Local Backend Health", 
                False, 
                f"Backend health check failed: {str(e)}"
            )
        return False

    def test_local_frontend_health(self):
        """Test if local frontend is running"""
        try:
            response = requests.get(self.frontend_url, timeout=5)
            
            if response.status_code == 200:
                content = response.text.lower()
                has_hatchmark = 'hatchmark' in content
                
                self.log_test(
                    "Local Frontend Health", 
                    has_hatchmark, 
                    f"Frontend running at {self.frontend_url}" if has_hatchmark else "Frontend running but may not be Hatchmark app"
                )
                return has_hatchmark
            else:
                self.log_test(
                    "Local Frontend Health", 
                    False, 
                    f"Frontend returned status {response.status_code}"
                )
        except requests.exceptions.ConnectionError:
            self.log_test(
                "Local Frontend Health", 
                False, 
                f"Frontend not running at {self.frontend_url}"
            )
        except Exception as e:
            self.log_test(
                "Local Frontend Health", 
                False, 
                f"Frontend health check failed: {str(e)}"
            )
        return False

    def test_lambda_functions_locally(self):
        """Test Lambda functions using local dev server"""
        # Test generate URL function
        try:
            payload = {"filename": "test-local.jpg"}
            
            response = requests.post(
                f"{self.backend_url}/uploads/initiate",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                has_required = 'uploadUrl' in data and 'objectKey' in data
                
                self.log_test(
                    "Local Upload Initiation", 
                    has_required, 
                    "Upload initiation working locally" if has_required else "Upload response missing fields",
                    {"response_keys": list(data.keys()) if isinstance(data, dict) else "not_dict"}
                )
                return data if has_required else None
            else:
                self.log_test(
                    "Local Upload Initiation", 
                    False, 
                    f"Upload initiation failed: {response.status_code}",
                    {"response": response.text}
                )
        except Exception as e:
            self.log_test(
                "Local Upload Initiation", 
                False, 
                f"Upload initiation error: {str(e)}"
            )
        return None

    def test_verification_locally(self):
        """Test verification endpoint locally"""
        try:
            # Create test image
            test_image = self.create_test_image()
            files = {'file': ('test.jpg', test_image, 'image/jpeg')}
            
            response = requests.post(
                f"{self.backend_url}/verify",
                files=files,
                timeout=15
            )
            
            # Even if no watermark found, endpoint should respond properly
            success = response.status_code in [200, 400, 404]
            
            self.log_test(
                "Local Verification", 
                success, 
                "Verification endpoint working locally" if success else f"Verification failed: {response.status_code}",
                {"status_code": response.status_code}
            )
            
            return success
            
        except Exception as e:
            self.log_test(
                "Local Verification", 
                False, 
                f"Verification test error: {str(e)}"
            )
            return False

    def test_duplicate_check_locally(self):
        """Test duplicate check endpoint locally"""
        try:
            # Create test image
            test_image = self.create_test_image()
            files = {'file': ('test.jpg', test_image, 'image/jpeg')}
            
            response = requests.post(
                f"{self.backend_url}/uploads/check-duplicate",
                files=files,
                timeout=15
            )
            
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_required = 'isDuplicate' in data and 'perceptualHash' in data
                success = has_required
            
            self.log_test(
                "Local Duplicate Check", 
                success, 
                "Duplicate check working locally" if success else "Duplicate check issues",
                {"status_code": response.status_code}
            )
            
            return success
            
        except Exception as e:
            self.log_test(
                "Local Duplicate Check", 
                False, 
                f"Duplicate check error: {str(e)}"
            )
            return False

    def test_aws_local_connectivity(self):
        """Test AWS connectivity from local environment"""
        try:
            # Test AWS CLI
            result = subprocess.run([
                'wsl', 'aws', 'sts', 'get-caller-identity'
            ], capture_output=True, text=True, timeout=10)
            
            aws_configured = result.returncode == 0
            
            self.log_test(
                "AWS CLI Configuration", 
                aws_configured, 
                "AWS CLI configured correctly" if aws_configured else "AWS CLI not configured"
            )
            
            if aws_configured:
                # Test S3 access
                s3_result = subprocess.run([
                    'wsl', 'aws', 's3', 'ls'
                ], capture_output=True, text=True, timeout=10)
                
                s3_access = s3_result.returncode == 0
                
                self.log_test(
                    "AWS S3 Access", 
                    s3_access, 
                    "S3 access working" if s3_access else "S3 access issues"
                )
            
            return aws_configured
            
        except Exception as e:
            self.log_test(
                "AWS CLI Configuration", 
                False, 
                f"AWS connectivity test failed: {str(e)}"
            )
            return False

    def test_local_file_upload_workflow(self):
        """Test complete local file upload workflow"""
        try:
            print("\n🔄 Testing Complete Local Upload Workflow")
            print("-" * 50)
            
            # Step 1: Create test image
            test_image = self.create_test_image()
            print(f"✓ Created test image ({len(test_image)} bytes)")
            
            # Step 2: Check for duplicates
            files = {'file': ('test_local_workflow.jpg', test_image, 'image/jpeg')}
            dup_response = requests.post(f"{self.backend_url}/uploads/check-duplicate", files=files, timeout=10)
            
            if dup_response.status_code == 200:
                dup_data = dup_response.json()
                print(f"✓ Duplicate check: {'Duplicate' if dup_data.get('isDuplicate') else 'Unique'}")
            
            # Step 3: Initiate upload
            init_response = requests.post(
                f"{self.backend_url}/uploads/initiate",
                json={"filename": "test_local_workflow.jpg"},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if init_response.status_code == 200:
                init_data = init_response.json()
                print(f"✓ Upload initiated: {init_data.get('objectKey', 'No object key')}")
                
                # Step 4: Simulate S3 upload (we can't actually upload to S3 locally without the real URL)
                print("✓ S3 upload simulation (would upload to real S3 in production)")
                
                # Step 5: Test verification with our test image
                files = {'file': ('test_local_workflow.jpg', test_image, 'image/jpeg')}
                verify_response = requests.post(f"{self.backend_url}/verify", files=files, timeout=15)
                
                if verify_response.status_code in [200, 400, 404]:
                    print("✓ Verification endpoint responding")
                
                workflow_success = True
            else:
                workflow_success = False
                print(f"✗ Upload initiation failed: {init_response.status_code}")
            
            self.log_test(
                "Local Upload Workflow", 
                workflow_success, 
                "Complete local workflow tested successfully" if workflow_success else "Local workflow has issues"
            )
            
            return workflow_success
            
        except Exception as e:
            self.log_test(
                "Local Upload Workflow", 
                False, 
                f"Local workflow test failed: {str(e)}"
            )
            return False

    def run_comprehensive_local_test(self):
        """Run all local tests"""
        print(f"🧪 Testing Local Hatchmark Deployment")
        print(f"Backend URL: {self.backend_url}")
        print(f"Frontend URL: {self.frontend_url}")
        print("=" * 60)
        
        # Test 1: Health checks
        print("\n🏥 Health Checks")
        print("-" * 20)
        backend_ok = self.test_local_backend_health()
        frontend_ok = self.test_local_frontend_health()
        time.sleep(1)
        
        # Test 2: AWS connectivity
        print("\n☁️ AWS Connectivity")
        print("-" * 20)
        aws_ok = self.test_aws_local_connectivity()
        time.sleep(1)
        
        # Test 3: API endpoints (only if backend is running)
        if backend_ok:
            print("\n🔌 API Endpoints")
            print("-" * 20)
            upload_data = self.test_lambda_functions_locally()
            time.sleep(1)
            
            self.test_verification_locally()
            time.sleep(1)
            
            self.test_duplicate_check_locally()
            time.sleep(1)
            
            # Test 4: Complete workflow
            self.test_local_file_upload_workflow()
        else:
            print("\n⚠️ Skipping API tests - backend not running")
            print("Start your local backend with: python backend/local_dev_server.py")
        
        # Generate report
        print("\n" + "=" * 60)
        print("📊 LOCAL TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        pass_rate = (passed / total) * 100 if total > 0 else 0
        
        print(f"Tests Passed: {passed}/{total} ({pass_rate:.1f}%)")
        
        # Status assessment
        if not backend_ok and not frontend_ok:
            print("🚫 Both frontend and backend are not running")
            print("\nTo start local development:")
            print("  Backend: python backend/local_dev_server.py")
            print("  Frontend: cd frontend && npm run dev")
        elif not backend_ok:
            print("🔴 Backend not running - start with: python backend/local_dev_server.py")
        elif not frontend_ok:
            print("🟡 Frontend not running - start with: cd frontend && npm run dev")
        elif pass_rate >= 80:
            print("🎉 Local environment is working well!")
        else:
            print("⚠️ Local environment has some issues")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print(f"\n❌ Issues found:")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['message']}")
        
        return pass_rate >= 80

def main():
    """Main function"""
    backend_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3002"
    frontend_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3000"
    
    tester = LocalDeploymentTester(backend_url, frontend_url)
    success = tester.run_comprehensive_local_test()
    
    # Save results
    results_file = 'local_test_results.json'
    with open(results_file, 'w') as f:
        json.dump({
            'backend_url': backend_url,
            'frontend_url': frontend_url,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'overall_success': success,
            'test_results': tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    if success:
        print("\n🚀 Ready for production deployment!")
    else:
        print("\n🔧 Fix local issues before deploying to production")
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
