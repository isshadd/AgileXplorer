#!/bin/bash

# Exit script on any error
set -e

echo "🚀 Setting up Node.js and ROS 2 environment..."

# 1️⃣ Install NVM (Node Version Manager)
echo "📥 Installing NVM..."
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash

# Load NVM to current shell session
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Install and use the latest LTS version of Node.js
echo "🟢 Installing Node.js (LTS)..."
nvm install --lts
nvm use --lts

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

# 8️⃣ Start the NestJS project
echo "🚀 Starting the server..."
npm run start

echo "🎉 Environment setup complete!"
