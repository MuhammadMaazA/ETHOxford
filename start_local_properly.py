#!/usr/bin/env python3
"""
Properly start both backend and frontend using WSL for everything
"""

import subprocess
import sys
import time
import os

def run_wsl_command(command, cwd=None):
    """Run command in WSL"""
    if cwd:
        full_command = f"cd {cwd} && {command}"
    else:
        full_command = command
    
    return subprocess.run([
        'wsl', 'bash', '-c', full_command
    ], capture_output=True, text=True)

def start_backend_wsl():
    """Start backend using WSL"""
    print("🔧 Starting backend server in WSL...")
    
    # Check if backend files exist
    result = run_wsl_command("ls -la backend/local_dev_server.py")
    if result.returncode != 0:
        print("❌ Backend server file not found")
        return False
    
    print("✅ Backend files found")
    
    # Start backend in background using WSL
    try:
        process = subprocess.Popen([
            'wsl', 'bash', '-c', 
            'cd backend && python3 local_dev_server.py'
        ])
        
        print(f"✅ Backend started in WSL with PID {process.pid}")
        
        # Wait for it to be ready
        print("⏳ Waiting for backend to be ready...")
        for i in range(10):
            time.sleep(2)
            test_result = run_wsl_command("curl -s http://localhost:3002/health")
            if test_result.returncode == 0 and "healthy" in test_result.stdout:
                print("✅ Backend is ready!")
                return process
            print(f"  Waiting... ({i+1}/10)")
        
        print("⚠️ Backend may not be fully ready yet")
        return process
        
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False

def start_frontend_wsl():
    """Start frontend using WSL"""
    print("🎨 Starting frontend server in WSL...")
    
    # Check if frontend files exist
    result = run_wsl_command("ls -la frontend/package.json")
    if result.returncode != 0:
        print("❌ Frontend package.json not found")
        return False
    
    print("✅ Frontend files found")
    
    # Check if node_modules exists, install if not
    result = run_wsl_command("ls frontend/node_modules", ".")
    if result.returncode != 0:
        print("📦 Installing frontend dependencies...")
        install_result = run_wsl_command("npm install", "frontend")
        if install_result.returncode != 0:
            print(f"❌ Failed to install dependencies: {install_result.stderr}")
            return False
        print("✅ Dependencies installed")
    
    # Start frontend in background using WSL
    try:
        process = subprocess.Popen([
            'wsl', 'bash', '-c', 
            'cd frontend && npm run dev'
        ])
        
        print(f"✅ Frontend started in WSL with PID {process.pid}")
        
        # Wait for it to be ready
        print("⏳ Waiting for frontend to be ready...")
        for i in range(15):  # Frontend takes longer
            time.sleep(2)
            test_result = run_wsl_command("curl -s http://localhost:3000")
            if test_result.returncode == 0:
                print("✅ Frontend is ready!")
                return process
            print(f"  Waiting... ({i+1}/15)")
        
        print("⚠️ Frontend may not be fully ready yet")
        return process
        
    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")
        return False

def test_services():
    """Test both services"""
    print("\n🧪 Testing Services")
    print("-" * 20)
    
    # Test backend
    result = run_wsl_command("curl -s http://localhost:3002/health")
    if result.returncode == 0 and "healthy" in result.stdout:
        print("✅ Backend: http://localhost:3002 - Working")
    else:
        print("❌ Backend: http://localhost:3002 - Not responding")
    
    # Test frontend
    result = run_wsl_command("curl -s -I http://localhost:3000")
    if result.returncode == 0 and "200 OK" in result.stdout:
        print("✅ Frontend: http://localhost:3000 - Working")
    else:
        print("❌ Frontend: http://localhost:3000 - Not responding")
    
    # Test API endpoint
    result = run_wsl_command('curl -s -X POST http://localhost:3002/uploads/initiate -H "Content-Type: application/json" -d \'{"filename":"test.jpg"}\'')
    if result.returncode == 0 and "uploadUrl" in result.stdout:
        print("✅ API: Upload endpoint - Working")
    else:
        print("❌ API: Upload endpoint - Not working")

def main():
    print("🚀 Starting Hatchmark Local Development (WSL)")
    print("=" * 50)
    
    # Check WSL availability
    result = run_wsl_command("echo 'WSL Test'")
    if result.returncode != 0:
        print("❌ WSL not available or not working")
        return False
    
    print("✅ WSL is available")
    
    # Start services
    backend_process = start_backend_wsl()
    time.sleep(3)  # Give backend time to start
    
    frontend_process = start_frontend_wsl()
    time.sleep(5)  # Give frontend time to start
    
    # Test services
    test_services()
    
    print("\n" + "=" * 50)
    print("🎉 Local Development Environment")
    print("=" * 50)
    print("🔗 Backend:  http://localhost:3002")
    print("🔗 Frontend: http://localhost:3000")
    print("🔗 Health:   http://localhost:3002/health")
    print("\n💡 Open http://localhost:3000 in your browser")
    print("⌨️ Press Ctrl+C to stop all servers")
    
    # Keep running until interrupted
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        if backend_process:
            try:
                backend_process.terminate()
                backend_process.wait(timeout=5)
            except:
                backend_process.kill()
        
        if frontend_process:
            try:
                frontend_process.terminate()
                frontend_process.wait(timeout=5)
            except:
                frontend_process.kill()
        
        print("✅ All servers stopped")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
