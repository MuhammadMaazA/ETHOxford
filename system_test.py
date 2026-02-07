#!/usr/bin/env python3
"""
Hatchmark System Test
Complete end-to-end test of the Hatchmark Digital Authenticity Service
"""

import requests
import json
import time
import sys
from PIL import Image
import io
import os

def test_backend_health():
    """Test backend health endpoint"""
    print("Testing backend health...")
    try:
        response = requests.get('http://localhost:3002/health')
        if response.status_code == 200:
            data = response.json()
            print(f"Backend healthy: {data['status']}")
            return True
        else:
            print(f"Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"Backend health check error: {e}")
        return False

def test_upload_initiate():
    """Test upload initiation"""
    print("Testing upload initiation...")
    try:
        payload = {"filename": "test-image.jpg"}
        response = requests.post(
            'http://localhost:3002/uploads/initiate',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"Upload initiation successful: {data['uploadId']}")
            return data
        else:
            print(f"Upload initiation failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Upload initiation error: {e}")
        return None

def test_verification():
    """Test asset verification"""
    print("Testing asset verification...")
    try:
        # Test hash verification
        payload = {"hash": "test123"}
        response = requests.post(
            'http://localhost:3002/verify',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"Verification successful: verified={data['verified']}")
            return True
        else:
            print(f"Verification failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Verification error: {e}")
        return False

def test_ledger():
    """Test ledger operations"""
    print("Testing ledger operations...")
    try:
        # Get ledger
        response = requests.get('http://localhost:3002/ledger')
        if response.status_code == 200:
            data = response.json()
            print(f"Ledger retrieved: {data['total_count']} assets")
            
            # Add to ledger
            payload = {
                "perceptualHash": "test_hash_123",
                "objectKey": "uploads/test/image.jpg",
                "creatorId": "test_user"
            }
            response = requests.post(
                'http://localhost:3002/ledger',
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"Asset added to ledger: {data['assetId']}")
                return True
            else:
                print(f"Ledger add failed: {response.status_code}")
                return False
        else:
            print(f"Ledger get failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"Ledger error: {e}")
        return False

def test_watermarker():
    """Test watermarker functionality"""
    print("Testing watermarker...")
    try:
        # Create a test image
        test_image = Image.new('RGB', (100, 100), color='red')
        image_path = '/tmp/test_image.jpg'
        test_image.save(image_path)
        
        # Test the watermarker
        import sys
        sys.path.append('/home/mmaaz/projects/hatchmark/hatchmark-authenticity-service/watermarker')
        
        from main import HatchmarkWatermarker
        watermarker = HatchmarkWatermarker()
        
        result = watermarker.run_standalone(image_path)
        if result:
            print("Watermarker test successful")
            # Clean up
            os.remove(image_path)
            if os.path.exists(result):
                os.remove(result)
            return True
        else:
            print("Watermarker test failed")
            return False
            
    except Exception as e:
        print(f"Watermarker error: {e}")
        return False

def test_frontend():
    """Test frontend accessibility"""
    print("Testing frontend...")
    try:
        response = requests.get('http://localhost:8080')
        if response.status_code == 200:
            print("Frontend accessible")
            return True
        else:
            print(f"Frontend not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"Frontend error: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("HATCHMARK SYSTEM TEST")
    print("=" * 50)
    
    tests = [
        ("Backend Health", test_backend_health),
        ("Upload Initiation", test_upload_initiate),
        ("Asset Verification", test_verification),
        ("Ledger Operations", test_ledger),
        ("Watermarker", test_watermarker),
        ("Frontend", test_frontend)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * 30)
        try:
            if test_func():
                print(f"PASS: {test_name}")
                passed += 1
            else:
                print(f"FAIL: {test_name}")
        except Exception as e:
            print(f"ERROR: {test_name} - {e}")
    
    print("\n" + "=" * 50)
    print(f"TEST RESULTS: {passed}/{total} tests passed")
    print("=" * 50)
    
    if passed == total:
        print("ALL TESTS PASSED - Hatchmark system is fully operational!")
        return True
    else:
        print("SOME TESTS FAILED - Check the system configuration")
        return False

if __name__ == '__main__':
    main()
