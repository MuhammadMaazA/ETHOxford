#!/bin/bash

# Hatchmark Development Server Launcher
# This script starts both the backend and frontend servers

echo "🚀 Starting Hatchmark Digital Authenticity Service"
echo "=================================================="

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo -e "${YELLOW}Killing existing process on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
}

# Check if we're in the right directory
if [ ! -f "start-servers.sh" ]; then
    echo -e "${RED}Error: Please run this script from the hatchmark-authenticity-service directory${NC}"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo -e "${BLUE}Activating Python virtual environment...${NC}"
    source .venv/bin/activate
fi

# Check for backend dependencies
echo -e "${BLUE}Checking backend dependencies...${NC}"
if ! python -c "import flask, boto3, imagehash" 2>/dev/null; then
    echo -e "${YELLOW}Installing missing backend dependencies...${NC}"
    pip install flask flask-cors boto3 imagehash pillow
fi

# Check for frontend dependencies
echo -e "${BLUE}Checking frontend dependencies...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Kill existing processes on our ports
if check_port 3002; then
    kill_port 3002
fi

if check_port 8080; then
    kill_port 8080
fi

# Wait a moment for ports to be freed
sleep 2

echo -e "${GREEN}Starting backend server on port 3002...${NC}"
cd backend
source ../.venv/bin/activate
python local_dev_server.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo -e "${BLUE}Waiting for backend to initialize...${NC}"
sleep 3

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Backend started successfully (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}Starting frontend server on port 8080...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo -e "${BLUE}Waiting for frontend to initialize...${NC}"
sleep 5

# Check if frontend started successfully
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Frontend started successfully (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Hatchmark Service is now running!${NC}"
echo "=================================================="
echo -e "${BLUE}Frontend:${NC} http://localhost:8080"
echo -e "${BLUE}Backend API:${NC} http://localhost:3002"
echo ""
echo -e "${BLUE}Available API endpoints:${NC}"
echo "  GET  /health                 - Health check"
echo "  POST /uploads/initiate       - Get upload URL"
echo "  POST /verify                 - Verify asset"
echo "  GET  /ledger                 - View all assets"
echo "  POST /process                - Process uploaded asset"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    
    # Wait a moment and force kill if necessary
    sleep 2
    kill -9 $BACKEND_PID 2>/dev/null
    kill -9 $FRONTEND_PID 2>/dev/null
    
    echo -e "${GREEN}Servers stopped. Goodbye!${NC}"
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait

# If we get here, one of the processes died
echo -e "${RED}One of the servers stopped unexpectedly${NC}"
cleanup
