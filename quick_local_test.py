#!/usr/bin/env python3
"""
Quick local test - checks if services are running and starts them if needed
"""

import requests
import subprocess
import time
import sys
import os
from pathlib import Path

def check_backend():
    """Check if backend is running"""
    try:
        response = requests.get("http://localhost:3002/health", timeout=3)
        if response.status_code == 200:
            print("✅ Backend is running at http://localhost:3002")
            return True
        else:
            print(f"⚠️ Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running at http://localhost:3002")
        return False
    except Exception as e:
        print(f"❌ Backend check failed: {e}")
        return False

def check_frontend():
    """Check if frontend is running"""
    try:
        response = requests.get("http://localhost:3000", timeout=3)
        if response.status_code == 200:
            print("✅ Frontend is running at http://localhost:3000")
            return True
        else:
            print(f"⚠️ Frontend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Frontend is not running at http://localhost:3000")
        return False
    except Exception as e:
        print(f"❌ Frontend check failed: {e}")
        return False

def start_backend():
    """Start backend server"""
    print("🚀 Starting backend server...")
    
    backend_path = Path("backend")
    if not backend_path.exists():
        print("❌ Backend directory not found")
        return False
    
    dev_server = backend_path / "local_dev_server.py"
    if not dev_server.exists():
        print("❌ local_dev_server.py not found")
        return False
    
    try:
        # Start backend in background
        process = subprocess.Popen([
            sys.executable, "local_dev_server.py"
        ], cwd=str(backend_path))
        
        print(f"Backend started with PID {process.pid}")
        
        # Wait for it to be ready
        for i in range(10):
            time.sleep(1)
            if check_backend():
                return True
            print(f"Waiting for backend... ({i+1}/10)")
        
        print("❌ Backend failed to start properly")
        return False
        
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False

def test_backend_endpoints():
    """Test key backend endpoints"""
    print("\n🧪 Testing Backend Endpoints")
    print("-" * 30)
    
    # Test upload initiation
    try:
        payload = {"filename": "test.jpg"}
        response = requests.post(
            "http://localhost:3002/uploads/initiate",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'uploadUrl' in data and 'objectKey' in data:
                print("✅ Upload initiation endpoint working")
                return data
            else:
                print("⚠️ Upload initiation missing fields")
        else:
            print(f"❌ Upload initiation failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Upload initiation error: {e}")
    
    # Test verification endpoint
    try:
        # Create a simple test file
        files = {'file': ('test.jpg', b'fake image data', 'image/jpeg')}
        response = requests.post(
            "http://localhost:3002/verify",
            files=files,
            timeout=10
        )
        
        if response.status_code in [200, 400]:  # 400 is OK for invalid image
            print("✅ Verification endpoint responding")
        else:
            print(f"⚠️ Verification endpoint status: {response.status_code}")
    except Exception as e:
        print(f"❌ Verification endpoint error: {e}")
    
    # Test duplicate check
    try:
        files = {'file': ('test.jpg', b'fake image data', 'image/jpeg')}
        response = requests.post(
            "http://localhost:3002/uploads/check-duplicate",
            files=files,
            timeout=10
        )
        
        if response.status_code in [200, 400]:
            print("✅ Duplicate check endpoint responding")
        else:
            print(f"⚠️ Duplicate check status: {response.status_code}")
    except Exception as e:
        print(f"❌ Duplicate check error: {e}")

def main():
    print("🧪 Quick Local Test for Hatchmark")
    print("=" * 40)
    
    # Check current status
    backend_running = check_backend()
    frontend_running = check_frontend()
    
    # Start backend if not running
    if not backend_running:
        print("\n🔧 Backend not running, attempting to start...")
        backend_running = start_backend()
    
    if backend_running:
        test_backend_endpoints()
    
    print("\n📊 Summary")
    print("-" * 20)
    print(f"Backend:  {'✅ Running' if backend_running else '❌ Not running'}")
    print(f"Frontend: {'✅ Running' if frontend_running else '❌ Not running'}")
    
    if not frontend_running:
        print("\n💡 To start frontend:")
        print("   cd frontend")
        print("   npm install  # if needed")
        print("   npm run dev")
    
    if backend_running:
        print("\n🎯 Backend is ready for testing!")
        print("   Health: http://localhost:3002/health")
        print("   Upload: http://localhost:3002/uploads/initiate")
    
    return backend_running or frontend_running

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
