#!/usr/bin/env python3
"""
Simple backend starter and tester
"""

import subprocess
import sys
import time
import requests
from pathlib import Path

def start_and_test_backend():
    print("🚀 Starting Hatchmark Backend")
    print("=" * 30)
    
    # Check if backend directory exists
    backend_path = Path("backend")
    if not backend_path.exists():
        print("❌ Backend directory not found")
        return False
    
    dev_server = backend_path / "local_dev_server.py"
    if not dev_server.exists():
        print("❌ local_dev_server.py not found")
        return False
    
    print("📁 Backend files found")
    
    # Start backend
    print("🔧 Starting backend server...")
    try:
        # Start the server
        process = subprocess.Popen([
            sys.executable, str(dev_server)
        ], cwd=str(backend_path))
        
        print(f"✅ Backend started with PID {process.pid}")
        
        # Wait and test
        print("⏳ Waiting for backend to be ready...")
        for i in range(15):  # Wait up to 15 seconds
            time.sleep(1)
            try:
                response = requests.get("http://localhost:3002/health", timeout=2)
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Backend is ready! Status: {data.get('status')}")
                    
                    # Quick test
                    print("\n🧪 Quick API Test:")
                    test_payload = {"filename": "test.jpg"}
                    test_response = requests.post(
                        "http://localhost:3002/uploads/initiate",
                        json=test_payload,
                        timeout=5
                    )
                    
                    if test_response.status_code == 200:
                        test_data = test_response.json()
                        print(f"✅ Upload endpoint working: {test_data.get('objectKey', 'No key')}")
                    else:
                        print(f"⚠️ Upload endpoint status: {test_response.status_code}")
                    
                    print(f"\n🌐 Backend running at: http://localhost:3002")
                    print("🔍 Health check: http://localhost:3002/health")
                    print("\n⌨️ Press Ctrl+C to stop the server")
                    
                    # Keep running
                    try:
                        while True:
                            time.sleep(1)
                    except KeyboardInterrupt:
                        print("\n🛑 Stopping backend...")
                        process.terminate()
                        process.wait()
                        print("✅ Backend stopped")
                    
                    return True
            except:
                pass
            print(f"  Still waiting... ({i+1}/15)")
        
        print("❌ Backend failed to respond")
        process.terminate()
        return False
        
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False

if __name__ == "__main__":
    success = start_and_test_backend()
    sys.exit(0 if success else 1)
