#!/bin/bash

PID=$(sudo lsof -ti :3000)
if [ -n "$PID" ]; then
  echo "Killing process $PID on port 3000"
  sudo kill -9 $PID
fi


# Go to the limo directory and build the messages package
cd ../robot/limo && \
colcon build --packages-select limo_msgs && \
source install/setup.bash && \

# Return to server directory and set up ROS environment
cd ../../server && \
source /opt/ros/humble/setup.bash && \
source ../robot/limo/install/setup.bash && \

# Install dependencies and generate message types
npm install && \
npx generate-ros-messages && \

# Set environment variables
export ROS_DOMAIN_ID=102
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(pwd)/../robot/limo/install/limo_msgs/lib

# Start the server
npm run start:dev