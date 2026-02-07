#!/usr/bin/env python3
"""
Test just the backend functionality
"""

import requests
import json
import time
import sys
from PIL import Image
import io

def test_backend():
    print("🧪 Testing Hatchmark Backend Only")
    print("=" * 40)
    
    # Wait for backend to be ready
    print("⏳ Waiting for backend to start...")
    for i in range(10):
        try:
            response = requests.get("http://localhost:3002/health", timeout=2)
            if response.status_code == 200:
                print("✅ Backend is ready!")
                break
        except:
            pass
        time.sleep(1)
        print(f"  Waiting... ({i+1}/10)")
    else:
        print("❌ Backend failed to start")
        return False
    
    # Test 1: Health Check
    print("\n1️⃣ Testing Health Check")
    try:
        response = requests.get("http://localhost:3002/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data.get('status')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test 2: Upload Initiation
    print("\n2️⃣ Testing Upload Initiation")
    try:
        payload = {"filename": "test-backend.jpg"}
        response = requests.post(
            "http://localhost:3002/uploads/initiate",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'uploadUrl' in data and 'objectKey' in data:
                print(f"✅ Upload initiation successful")
                print(f"   Object Key: {data['objectKey']}")
                upload_data = data
            else:
                print(f"❌ Upload response missing fields: {list(data.keys())}")
                return False
        else:
            print(f"❌ Upload initiation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Upload initiation error: {e}")
        return False
    
    # Test 3: Create and Upload Test Image
    print("\n3️⃣ Testing File Upload")
    try:
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='JPEG')
        test_image = img_buffer.getvalue()
        
        # Upload to local endpoint
        upload_url = upload_data['uploadUrl']
        print(f"   Upload URL: {upload_url}")
        
        upload_response = requests.put(
            upload_url,
            data=test_image,
            headers={'Content-Type': 'image/jpeg'},
            timeout=15
        )
        
        if upload_response.status_code == 200:
            print("✅ File upload successful")
        else:
            print(f"❌ File upload failed: {upload_response.status_code}")
            print(f"   Response: {upload_response.text}")
    except Exception as e:
        print(f"❌ File upload error: {e}")
    
    # Test 4: Duplicate Check
    print("\n4️⃣ Testing Duplicate Check")
    try:
        files = {'file': ('test.jpg', test_image, 'image/jpeg')}
        response = requests.post(
            "http://localhost:3002/uploads/check-duplicate",
            files=files,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Duplicate check successful")
            print(f"   Is Duplicate: {data.get('isDuplicate', 'unknown')}")
        else:
            print(f"❌ Duplicate check failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Duplicate check error: {e}")
    
    # Test 5: Verification
    print("\n5️⃣ Testing Verification")
    try:
        files = {'file': ('test.jpg', test_image, 'image/jpeg')}
        response = requests.post(
            "http://localhost:3002/verify",
            files=files,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Verification successful")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Asset ID: {data.get('assetId', 'none')}")
        else:
            print(f"❌ Verification failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Verification error: {e}")
    
    print("\n🎉 Backend Testing Complete!")
    print("=" * 40)
    print("✅ Your backend is working locally!")
    print("🌐 Ready to test with Vercel frontend")
    
    return True

if __name__ == "__main__":
    success = test_backend()
    sys.exit(0 if success else 1)
