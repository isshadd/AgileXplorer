#!/bin/bash

set -e

export ROS_DOMAIN_ID=102
export NVM_DIR="/root/.nvm"
source /opt/ros/humble/setup.bash
source "$NVM_DIR/nvm.sh"
nvm use 20

# MongoDB
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

    echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-6.0.list

    apt-get update
    apt-get install -y mongodb-org
fi

mkdir -p /var/lib/mongodb
chown -R mongodb:mongodb /var/lib/mongodb
chmod -R 744 /var/lib/mongodb
mongod --logpath /var/log/mongodb.log &

attempt=1
max_attempts=30
until mongosh --eval "db.version()" &>/dev/null || [ $attempt -gt $max_attempts ]; do
    sleep 2
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    exit 1
fi

# Client
cd /root/ws/client
ng serve --host 0.0.0.0 & sleep 10

# Gazebo & ROS
cd /root/ws/robot/gazebo
source /opt/ros/humble/setup.bash
colcon build
source install/setup.bash

ros2 launch ros_gz_example_bringup diff_drive.launch.py robot_count:=2 & sleep 5
ros2 launch ros_gz_example_bringup map.launch.py use_sim_time:=true & sleep 5
ros2 launch ros_gz_example_bringup navigation2.launch.py namespace:=limo1 use_sim_time:=true   autostart:=true & sleep 7
ros2 launch ros_gz_example_bringup navigation2.launch.py namespace:=limo2 use_sim_time:=true   autostart:=true & sleep 7

cd /root/ws/robot/robot
colcon build
source install/setup.bash

ros2 launch robot robot.launch.py id:=limo1 & sleep 5
ros2 launch robot robot.launch.py id:=limo2 & sleep 5

# Server
cd /root/ws/server
rm -rf node_modules package-lock.json 
npm install
npm install socks@2.6.1 smart-buffer@4.2.0 
npm install @nestjs/mongoose mongoose
npm install @nestjs/platform-socket.io @nestjs/websockets --legacy-peer-deps
npm install -D @types/mongoose
npm run start:dev & tail -f /dev/null
