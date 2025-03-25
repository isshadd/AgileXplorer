#!/bin/bash

# Don't exit on error, we'll handle errors manually
set +e

echo "🔄 Starting server setup..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Source ROS 2 if available
if [ -f "/opt/ros/humble/setup.bash" ]; then
    echo "🤖 Sourcing ROS 2..."
    source /opt/ros/humble/setup.bash
    export ROS_DOMAIN_ID=102

    # Check if rclnodejs is installed
    if ! npm list rclnodejs &> /dev/null; then
        echo "📦 Installing rclnodejs..."
        npm install rclnodejs --save
    fi
else
    echo "⚠️  ROS 2 Humble not found, robot data logging will be disabled"
fi

# Check if MongoDB is installed
if ! command_exists mongod; then
    echo "❌ MongoDB is not installed. Please run ./server-dependencies.sh first"
    exit 1
fi

# Check for running process on port 3000
PID=$(sudo lsof -ti :3000 2>/dev/null)
if [ -n "$PID" ]; then
    echo "🔴 Killing process $PID on port 3000"
    sudo kill -9 $PID
fi

# Check MongoDB status and start if needed
echo "🔄 Checking MongoDB status..."
if ! systemctl is-active --quiet mongod; then
    echo "🔄 Starting MongoDB service..."
    sudo systemctl start mongod

    # Wait for MongoDB to be ready
    echo "⏳ Waiting for MongoDB to be ready..."
    attempt=1
    max_attempts=30
    while ! mongosh --eval "db.version()" >/dev/null 2>&1; do
        if [ $attempt -gt $max_attempts ]; then
            echo "❌ Error: MongoDB failed to start"
            exit 1
        fi
        echo "Attempt $attempt of $max_attempts: Waiting for MongoDB to be ready..."
        sleep 2
        ((attempt++))
    done
fi

echo "✅ MongoDB is running"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Start the server
echo "🚀 Starting NestJS server..."
# Source ROS2 environment
source /opt/ros/humble/setup.bash

# Source our workspace environment
source ../robot/limo/install/setup.bash

#generate messages types
npx generate-ros-messages

# Set environment variables
export ROS_DOMAIN_ID=102
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(pwd)/../robot/limo/install/limo_msgs/lib

# Start the server
npm run start:dev