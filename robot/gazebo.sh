#!/bin/bash

export ROS_DOMAIN_ID=102

# Build Gazebo
(
  cd gazebo || exit 1
  export LIBGL_ALWAYS_SOFTWARE=1
  source /opt/ros/humble/setup.bash
  source install/setup.bash
  colcon build --cmake-args -DBUILD_TESTING=ON
  source install/setup.bash
  ros2 launch ros_gz_example_bringup diff_drive.launch.py
) &

sleep 10 

# Build robot 1 ?? robot 2 too? ??
(
  cd robot || exit 1
  source /opt/ros/humble/setup.bash
  source install/setup.bash
  colcon build
  source install/setup.bash
  ros2 launch robot robot.launch.py id:=robot1_102
) &

wait # Wait till both finish