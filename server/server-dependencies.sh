#!/bin/bash

export ROS_DOMAIN_ID=102

# Exit script on any error
set -e

echo "🚀 Setting up Node.js and ROS 2 environment..."

# 1️⃣ Install NVM (Node Version Manager)
echo "📥 Installing NVM..."
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash

# Load NVM to current shell session
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Install and use Node.js v20 explicitly
echo "🟢 Installing Node.js v20..."
nvm install 20
nvm use 20

# Set Node.js v20 as the default version
nvm alias default 20

# Confirm Node.js and npm versions
node -v
npm -v

# 2️⃣ Check and Install ROS 2 (Humble)
if ! command -v ros2 &> /dev/null; then
    echo "🛠️ Installing ROS 2 Humble..."
    sudo apt update && sudo apt install -y curl gnupg2 lsb-release
    sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key | sudo apt-key add -
    sudo sh -c 'echo "deb http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" > /etc/apt/sources.list.d/ros2.list'
    sudo apt update
    sudo apt install -y ros-humble-ros-base
fi

# Source ROS 2
echo "🔄 Sourcing ROS 2..."
source /opt/ros/humble/setup.bash

# 3️⃣ Clean existing dependencies
echo "🗑️ Removing old dependencies..."
rm -rf node_modules package-lock.json

# 4️⃣ Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# 5️⃣ Ensure NestJS CLI is installed globally
if ! command -v nest &> /dev/null; then
    echo "🚀 Installing NestJS CLI..."
    npm install -g @nestjs/cli
fi

# 6️⃣ Install `rclnodejs` (after ensuring ROS 2 is installed)
if ! npm list rclnodejs &> /dev/null; then
    echo "🔗 Installing rclnodejs..."
    npm install rclnodejs --save
fi

# 7️⃣ Verify `rclnodejs` installation
echo "✅ Checking rclnodejs installation..."
node -e "require('rclnodejs').init().then(() => console.log('rclnodejs is installed and ready!')).catch(err => console.error('rclnodejs setup failed:', err))"

# 8️⃣ Install and configure MongoDB
echo "📦 Setting up MongoDB..."
# Install MongoDB-related dependencies
    npm install @nestjs/mongoose mongoose

    # Install WebSocket dependencies with legacy peer deps
    npm install @nestjs/platform-socket.io @nestjs/websockets --legacy-peer-deps

    # Install types for development
    npm install -D @types/mongoose
# Check if MongoDB is already installed
if ! command -v mongod &> /dev/null; then
    echo "Installing MongoDB..."
    
    # Import MongoDB public GPG key if not already imported
    if [ ! -f /usr/share/keyrings/mongodb-server-6.0.gpg ]; then
        curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg \
        --dearmor
    fi

    # Add MongoDB repository if not already added
    if [ ! -f /etc/apt/sources.list.d/mongodb-org-6.0.list ]; then
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    fi

    # Install MongoDB packages
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    
else
    echo "MongoDB is already installed"
fi

# Ensure MongoDB data directory exists with correct permissions
sudo mkdir -p /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chmod -R 744 /var/lib/mongodb

# Start MongoDB service
echo "🚀 Starting MongoDB service..."
if ! sudo systemctl is-active --quiet mongod; then
    sudo systemctl start mongod
fi

# Enable MongoDB service on boot
if ! sudo systemctl is-enabled --quiet mongod; then
    sudo systemctl enable mongod
fi

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
attempt=1
max_attempts=30
while ! mongosh --eval "db.version()" >/dev/null 2>&1; do
    if [ $attempt -gt $max_attempts ]; then
        echo "❌ Error: MongoDB failed to start within the timeout period"
        exit 1
    fi
    echo "Attempt $attempt of $max_attempts: Waiting for MongoDB to be ready..."
    sleep 2
    ((attempt++))
done

echo "✅ MongoDB is up and running"

# 9️⃣ Start the NestJS project
echo "🚀 Starting the server..."
npm run start:dev

echo "🎉 Environment setup complete!"
