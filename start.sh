#!/bin/bash

# Start script for DeltaHedge

echo "🚀 Starting DeltaHedge..."
echo ""

# Check if Python virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating Python environment..."
source venv/bin/activate

# Install Python dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating template..."
    echo "GOOGLE_API_KEY=your_gemini_api_key_here" > .env
    echo "TOKENC_API_KEY=your_tokenc_api_key_here" >> .env
    echo "Please edit .env with your API keys before continuing."
fi

# Start backend in background
echo "🔙 Starting backend server..."
python api.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Navigate to frontend
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Start frontend
echo "🎨 Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ DeltaHedge is running!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

