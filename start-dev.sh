#!/bin/bash

# Hatchmark Development Server Startup Script
echo "🚀 Starting Hatchmark Development Servers..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "local_dev_server" 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Activate virtual environment
if [ -d ".venv" ]; then
    echo "🐍 Activating virtual environment..."
    source .venv/bin/activate
fi

# Start backend
echo "▶️ Starting Backend Server (Python Flask)..."
cd backend
python local_dev_server.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to start
sleep 3

# Start frontend  
echo " Starting Frontend Server (Vite + React)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
cd ..

# Wait for frontend to start
sleep 3

echo ""
echo " Both servers are now running!"
echo "📱 Frontend: http://localhost:8080"
echo "🔧 Backend:  http://localhost:3002"
echo ""
echo "📋 Available API endpoints:"
echo "  GET  /health                 - Health check"
echo "  POST /uploads/initiate       - Get upload URL"
echo "  POST /verify                 - Verify asset"
echo "  GET  /ledger                 - View all assets"
echo "  POST /process                - Process uploaded asset"
echo ""
echo "Press Ctrl+C to stop both servers"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    sleep 2
    kill -9 $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "✅ Servers stopped!"
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Wait for processes
wait
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
}

# Start backend first
start_backend

# Wait for backend to start
echo " Waiting for backend to initialize..."
sleep 3

# Start frontend
start_frontend

# Wait for frontend to start
echo " Waiting for frontend to initialize..."
sleep 3

echo ""
echo " Development servers started!"
echo ""
echo " Backend API:  http://localhost:3002"
echo " Frontend:     http://localhost:8080 (or 8081 if 8080 is busy)"
echo ""
echo " Backend Endpoints:"
echo "   GET  /health"
echo "   POST /uploads/initiate"
echo "   POST /verify"
echo "   GET  /verify"
echo "   GET  /ledger"
echo "   POST /ledger"
echo ""
echo "  To stop both servers: Ctrl+C or run: ./stop-dev.sh"
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo " Shutting down development servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "local_dev_server" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    echo " Cleanup complete!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running and show logs
echo " Monitoring servers... (Press Ctrl+C to stop)"
echo "───────────────────────────────────────────────"

# Wait for user to stop
wait
