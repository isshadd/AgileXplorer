#!/bin/bash

PID=$(sudo lsof -ti :3000)
if [ -n "$PID" ]; then
  echo "Killing process $PID on port 3000"
  sudo kill -9 $PID
fi

source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=102
npm run start:dev