#!/usr/bin/env python3
"""
Comprehensive test script for Vercel deployment of Hatchmark Authenticity Service
Tests frontend deployment, API connectivity, and full workflow functionality
"""

import requests
import json
import time
import sys
import os
from typing import Dict, Any, Optional
from pathlib import Path

class VercelDeploymentTester:
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

    def test_frontend_accessibility(self):
        """Test if the Vercel frontend is accessible"""
        try:
            response = requests.get(self.vercel_url, timeout=10)
            
            if response.status_code == 200:
                # Check if it's actually HTML content
                content_type = response.headers.get('content-type', '')
                if 'text/html' in content_type:
                    self.log_test(
                        "Frontend Accessibility", 
                        True, 
                        f"Frontend is accessible at {self.vercel_url}",
                        {"status_code": response.status_code, "content_type": content_type}
                    )
                    return True
                else:
                    self.log_test(
                        "Frontend Accessibility", 
                        False, 
                        "Frontend returned non-HTML content",
                        {"status_code": response.status_code, "content_type": content_type}
                    )
            else:
                self.log_test(
                    "Frontend Accessibility", 
                    False, 
                    f"Frontend returned status {response.status_code}",
                    {"status_code": response.status_code}
                )
        except Exception as e:
            self.log_test(
                "Frontend Accessibility", 
                False, 
                f"Failed to connect to frontend: {str(e)}"
            )
        return False

    def test_frontend_resources(self):
        """Test if frontend static resources load correctly"""
        try:
            # Test common static resources
            resources_to_test = [
                '/favicon.ico',
                '/robots.txt'
            ]
            
            all_passed = True
            for resource in resources_to_test:
                try:
                    response = requests.get(f"{self.vercel_url}{resource}", timeout=5)
                    if response.status_code not in [200, 404]:  # 404 is acceptable for some resources
                        all_passed = False
                        break
                except:
                    all_passed = False
                    break
            
            self.log_test(
                "Frontend Static Resources", 
                all_passed, 
                "Static resources loading correctly" if all_passed else "Some static resources failed to load"
            )
            return all_passed
            
        except Exception as e:
            self.log_test(
                "Frontend Static Resources", 
                False, 
                f"Error testing static resources: {str(e)}"
            )
            return False

    def test_api_connectivity(self):
        """Test basic API connectivity"""
        try:
            # Test basic API health/connectivity
            test_endpoints = [
                '/uploads/initiate',  # This should return method not allowed for GET
                '/status/test',       # This might return an error but should be reachable
            ]
            
            api_reachable = False
            for endpoint in test_endpoints:
                try:
                    response = requests.get(f"{self.api_gateway_url}{endpoint}", timeout=10)
                    # Even error responses indicate the API is reachable
                    if response.status_code in [200, 400, 401, 403, 404, 405, 500, 502, 503]:
                        api_reachable = True
                        break
                except:
                    continue
            
            self.log_test(
                "API Connectivity", 
                api_reachable, 
                "API Gateway is reachable" if api_reachable else "API Gateway is not reachable",
                {"api_url": self.api_gateway_url}
            )
            return api_reachable
            
        except Exception as e:
            self.log_test(
                "API Connectivity", 
                False, 
                f"Error testing API connectivity: {str(e)}"
            )
            return False

    def test_cors_configuration(self):
        """Test CORS configuration between frontend and API"""
        try:
            # Make an OPTIONS request to test CORS
            headers = {
                'Origin': self.vercel_url,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            response = requests.options(
                f"{self.api_gateway_url}/uploads/initiate", 
                headers=headers, 
                timeout=10
            )
            
            cors_headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers')
            }
            
            cors_configured = any(cors_headers.values())
            
            self.log_test(
                "CORS Configuration", 
                cors_configured, 
                "CORS headers present" if cors_configured else "CORS headers missing",
                cors_headers
            )
            return cors_configured
            
        except Exception as e:
            self.log_test(
                "CORS Configuration", 
                False, 
                f"Error testing CORS: {str(e)}"
            )
            return False

    def test_upload_initiation(self):
        """Test the upload initiation endpoint"""
        try:
            payload = {
                "filename": "test-image.jpg"
            }
            
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
                    self.log_test(
                        "Upload Initiation", 
                        True, 
                        "Upload initiation working correctly",
                        {"object_key": data.get('objectKey')}
                    )
                    return True, data
                else:
                    self.log_test(
                        "Upload Initiation", 
                        False, 
                        "Response missing required fields",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Upload Initiation", 
                    False, 
                    f"Upload initiation failed with status {response.status_code}",
                    {"status_code": response.status_code, "response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Upload Initiation", 
                False, 
                f"Error testing upload initiation: {str(e)}"
            )
        
        return False, None

    def test_status_endpoint(self, object_key: str = "test-key"):
        """Test the status checking endpoint"""
        try:
            response = requests.get(
                f"{self.api_gateway_url}/status/{object_key}",
                timeout=10
            )
            
            # Even if the object doesn't exist, we should get a proper JSON response
            if response.status_code in [200, 404]:
                try:
                    data = response.json()
                    self.log_test(
                        "Status Endpoint", 
                        True, 
                        "Status endpoint responding correctly",
                        {"status_code": response.status_code}
                    )
                    return True
                except json.JSONDecodeError:
                    self.log_test(
                        "Status Endpoint", 
                        False, 
                        "Status endpoint returned invalid JSON"
                    )
            else:
                self.log_test(
                    "Status Endpoint", 
                    False, 
                    f"Status endpoint returned unexpected status {response.status_code}",
                    {"status_code": response.status_code}
                )
                
        except Exception as e:
            self.log_test(
                "Status Endpoint", 
                False, 
                f"Error testing status endpoint: {str(e)}"
            )
        
        return False

    def test_environment_variables(self):
        """Test if environment variables are properly configured"""
        # This test checks if the frontend can communicate with the API
        # which indirectly validates environment variable configuration
        
        try:
            # Check if the frontend loads without JavaScript errors
            # by looking for specific content or making API calls
            response = requests.get(self.vercel_url, timeout=10)
            
            if response.status_code == 200:
                content = response.text
                
                # Look for signs that the app loaded correctly
                indicators = [
                    'Hatchmark',  # App name should be present
                    'script',     # JavaScript should be loaded
                    'div',        # React should render
                ]
                
                loaded_correctly = all(indicator in content for indicator in indicators[:2])  # Check first 2
                
                self.log_test(
                    "Environment Variables", 
                    loaded_correctly, 
                    "Frontend appears to be configured correctly" if loaded_correctly else "Frontend may have configuration issues"
                )
                return loaded_correctly
            else:
                self.log_test(
                    "Environment Variables", 
                    False, 
                    "Cannot verify environment variables - frontend not accessible"
                )
                
        except Exception as e:
            self.log_test(
                "Environment Variables", 
                False, 
                f"Error testing environment variables: {str(e)}"
            )
        
        return False

    def test_security_headers(self):
        """Test if security headers are properly configured"""
        try:
            response = requests.get(self.vercel_url, timeout=10)
            
            expected_headers = [
                'x-frame-options',
                'x-content-type-options',
                'referrer-policy'
            ]
            
            present_headers = []
            for header in expected_headers:
                if header in response.headers:
                    present_headers.append(header)
            
            all_present = len(present_headers) == len(expected_headers)
            
            self.log_test(
                "Security Headers", 
                all_present, 
                f"Security headers configured ({len(present_headers)}/{len(expected_headers)})",
                {"present_headers": present_headers}
            )
            return all_present
            
        except Exception as e:
            self.log_test(
                "Security Headers", 
                False, 
                f"Error testing security headers: {str(e)}"
            )
            return False

    def run_comprehensive_test(self):
        """Run all tests and provide a summary"""
        print(f"🚀 Testing Vercel Deployment")
        print(f"Frontend URL: {self.vercel_url}")
        print(f"API Gateway URL: {self.api_gateway_url}")
        print("=" * 60)
        
        # Run all tests
        tests = [
            self.test_frontend_accessibility,
            self.test_frontend_resources,
            self.test_security_headers,
            self.test_environment_variables,
            self.test_api_connectivity,
            self.test_cors_configuration,
        ]
        
        for test in tests:
            test()
            time.sleep(0.5)  # Small delay between tests
        
        # Test upload endpoints if API is accessible
        if any(result['success'] for result in self.test_results if result['test'] == 'API Connectivity'):
            success, data = self.test_upload_initiation()
            if success and data:
                self.test_status_endpoint(data.get('objectKey', 'test-key'))
            else:
                self.test_status_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        
        if passed == total:
            print("🎉 All tests passed! Your Vercel deployment looks good!")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            
            failed_tests = [result for result in self.test_results if not result['success']]
            print("\nFailed Tests:")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['message']}")
            
            return False

def main():
    """Main function to run the tests"""
    if len(sys.argv) != 3:
        print("Usage: python test_vercel_deployment.py <vercel_url> <api_gateway_url>")
        print("Example: python test_vercel_deployment.py https://your-app.vercel.app https://api-id.execute-api.us-east-1.amazonaws.com")
        sys.exit(1)
    
    vercel_url = sys.argv[1]
    api_gateway_url = sys.argv[2]
    
    # Validate URLs
    if not vercel_url.startswith('https://'):
        print("❌ Vercel URL should start with https://")
        sys.exit(1)
    
    if not api_gateway_url.startswith('https://'):
        print("❌ API Gateway URL should start with https://")
        sys.exit(1)
    
    tester = VercelDeploymentTester(vercel_url, api_gateway_url)
    success = tester.run_comprehensive_test()
    
    # Save results to file
    results_file = 'vercel_test_results.json'
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
