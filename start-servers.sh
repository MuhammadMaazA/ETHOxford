#!/bin/bash

# Start backend server
echo "Starting backend server on port 3003..."
cd backend
python local_dev_server.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "Starting frontend server on port 8080..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Both servers started!"
echo "Frontend: http://localhost:8080"
echo "Backend: http://localhost:3003"

# Wait for any process to exit
wait
