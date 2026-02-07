#!/usr/bin/env python3
"""
Start local development environment for Hatchmark
Starts both backend and frontend servers
"""

import subprocess
import sys
import time
import os
import signal
import threading
from pathlib import Path

class LocalDevServer:
    def __init__(self):
        self.processes = []
        self.running = True
        
    def start_backend(self):
        """Start the local backend server"""
        print("🔧 Starting local backend server...")
        
        backend_path = Path("backend")
        if not backend_path.exists():
            print("❌ Backend directory not found")
            return None
            
        # Check if local dev server exists
        dev_server = backend_path / "local_dev_server.py"
        if not dev_server.exists():
            print("❌ local_dev_server.py not found in backend directory")
            return None
        
        try:
            # Start backend server
            process = subprocess.Popen([
                sys.executable, "local_dev_server.py"
            ], cwd=str(backend_path), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            self.processes.append(("Backend", process))
            print("✅ Backend server started on http://localhost:3002")
            return process
            
        except Exception as e:
            print(f"❌ Failed to start backend: {str(e)}")
            return None
    
    def start_frontend(self):
        """Start the local frontend server"""
        print("🎨 Starting local frontend server...")
        
        frontend_path = Path("frontend")
        if not frontend_path.exists():
            print("❌ Frontend directory not found")
            return None
            
        # Check if package.json exists
        package_json = frontend_path / "package.json"
        if not package_json.exists():
            print("❌ package.json not found in frontend directory")
            return None
        
        try:
            # Check if node_modules exists
            node_modules = frontend_path / "node_modules"
            if not node_modules.exists():
                print("📦 Installing frontend dependencies...")
                install_process = subprocess.run([
                    "npm", "install"
                ], cwd=str(frontend_path), capture_output=True, text=True)
                
                if install_process.returncode != 0:
                    print(f"❌ Failed to install dependencies: {install_process.stderr}")
                    return None
                print("✅ Dependencies installed")
            
            # Start frontend server
            process = subprocess.Popen([
                "npm", "run", "dev"
            ], cwd=str(frontend_path), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            self.processes.append(("Frontend", process))
            print("✅ Frontend server started on http://localhost:3000")
            return process
            
        except Exception as e:
            print(f"❌ Failed to start frontend: {str(e)}")
            return None
    
    def monitor_processes(self):
        """Monitor running processes"""
        def monitor_process(name, process):
            while self.running and process.poll() is None:
                time.sleep(1)
            
            if self.running:
                print(f"⚠️ {name} server stopped unexpectedly")
        
        for name, process in self.processes:
            thread = threading.Thread(target=monitor_process, args=(name, process))
            thread.daemon = True
            thread.start()
    
    def wait_for_servers(self):
        """Wait for servers to be ready"""
        import requests
        
        print("⏳ Waiting for servers to be ready...")
        
        # Wait for backend
        backend_ready = False
        for i in range(30):  # Wait up to 30 seconds
            try:
                response = requests.get("http://localhost:3002/health", timeout=2)
                if response.status_code == 200:
                    backend_ready = True
                    print("✅ Backend server is ready")
                    break
            except:
                pass
            time.sleep(1)
        
        if not backend_ready:
            print("⚠️ Backend server may not be ready")
        
        # Wait for frontend
        frontend_ready = False
        for i in range(30):  # Wait up to 30 seconds
            try:
                response = requests.get("http://localhost:3000", timeout=2)
                if response.status_code == 200:
                    frontend_ready = True
                    print("✅ Frontend server is ready")
                    break
            except:
                pass
            time.sleep(1)
        
        if not frontend_ready:
            print("⚠️ Frontend server may not be ready")
        
        return backend_ready, frontend_ready
    
    def stop_all(self):
        """Stop all processes"""
        print("\n🛑 Stopping all servers...")
        self.running = False
        
        for name, process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
                print(f"✅ {name} server stopped")
            except subprocess.TimeoutExpired:
                process.kill()
                print(f"🔪 {name} server force killed")
            except Exception as e:
                print(f"⚠️ Error stopping {name}: {str(e)}")
    
    def run(self):
        """Run the local development environment"""
        print("🚀 Starting Hatchmark Local Development Environment")
        print("=" * 60)
        
        # Setup signal handlers
        def signal_handler(signum, frame):
            self.stop_all()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        try:
            # Start servers
            backend_process = self.start_backend()
            time.sleep(2)  # Give backend time to start
            
            frontend_process = self.start_frontend()
            time.sleep(3)  # Give frontend time to start
            
            if not backend_process and not frontend_process:
                print("❌ Failed to start any servers")
                return False
            
            # Monitor processes
            self.monitor_processes()
            
            # Wait for servers to be ready
            backend_ready, frontend_ready = self.wait_for_servers()
            
            print("\n" + "=" * 60)
            print("🎉 Local Development Environment Status")
            print("=" * 60)
            
            if backend_ready:
                print("✅ Backend: http://localhost:3002")
            else:
                print("❌ Backend: Not ready")
                
            if frontend_ready:
                print("✅ Frontend: http://localhost:3000")
            else:
                print("❌ Frontend: Not ready")
            
            if backend_ready or frontend_ready:
                print("\n🧪 To test your local deployment:")
                print("   python test_local_deployment.py")
                print("\n⌨️ Press Ctrl+C to stop all servers")
                
                # Keep running until interrupted
                try:
                    while self.running:
                        time.sleep(1)
                except KeyboardInterrupt:
                    pass
            
            return backend_ready or frontend_ready
            
        except Exception as e:
            print(f"❌ Error running development environment: {str(e)}")
            return False
        finally:
            self.stop_all()

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("Usage: python start_local_dev.py")
        print("Starts both backend and frontend servers for local development")
        print("\nServers:")
        print("  Backend:  http://localhost:3002")
        print("  Frontend: http://localhost:3000")
        print("\nPress Ctrl+C to stop all servers")
        return
    
    dev_server = LocalDevServer()
    success = dev_server.run()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
