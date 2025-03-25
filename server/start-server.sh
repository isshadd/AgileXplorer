#!/bin/bash

PID=$(sudo lsof -ti :3000)
if [ -n "$PID" ]; then
  echo "Killing process $PID on port 3000"
  sudo kill -9 $PID
fi

# Source ROS2 environment
source /opt/ros/humble/setup.bash

# Source our workspace environment
source ../robot/limo/install/setup.bash

# Set environment variables
export ROS_DOMAIN_ID=102
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(pwd)/../robot/limo/install/limo_msgs/lib

# Start the server
npm run start:dev