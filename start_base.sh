#!/bin/bash

set +e

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

##########################################
# Setup ROS 2
##########################################
if [ -f "/opt/ros/humble/setup.bash" ]; then
    source /opt/ros/humble/setup.bash
    export ROS_DOMAIN_ID=102
else
    echo "ROS 2 Humble not found"
    exit 1
fi

##########################################
# Setup Node.js
##########################################
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    if ! nvm use 20 &>/dev/null; then
        nvm install 20
        nvm use 20
    fi
else
    echo "NVM not found"
    exit 1
fi

##########################################
# Setup MongoDB
##########################################
if ! command_exists mongod; then
    echo "MongoDB is not installed"
    exit 1
fi

echo "Checking MongoDB status..."
if ! systemctl is-active --quiet mongod; then
    sudo systemctl start mongod
    attempt=1
    max_attempts=30
    while ! mongosh --eval "db.version()" >/dev/null 2>&1; do
        if [ $attempt -gt $max_attempts ]; then
            echo "MongoDB failed to start"
            exit 1
        fi
        sleep 2
        ((attempt++))
    done
fi

##########################################
# Start Client
##########################################
cd ./client
if [ ! -d "node_modules" ]; then
    npm install
fi
ng serve --host 0.0.0.0 &

##########################################
# Start Server
##########################################
cd ../server

PID=$(lsof -ti :3000)
if [ -n "$PID" ]; then
    echo "Killing process $PID on port 3000"
    kill -9 $PID
fi

if [ ! -d "node_modules" ]; then
    npm install
fi

cd ../robot/limo
colcon build --packages-select limo_msgs
source install/setup.bash

cd ../../server
source /opt/ros/humble/setup.bash
source ../robot/limo/install/setup.bash

npm install
npx generate-ros-messages

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(pwd)/../robot/limo/install/limo_msgs/lib
npm run start:dev &
