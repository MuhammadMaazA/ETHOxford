#!/bin/bash

# Hatchmark Development Server Stop Script
echo " Stopping Hatchmark Development Servers..."

# Kill backend processes
echo " Stopping Backend Server..."
pkill -f "local_dev_server" 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Kill frontend processes  
echo " Stopping Frontend Server..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

echo " All development servers stopped!"
