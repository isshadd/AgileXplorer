#!/bin/bash

cd ../gazebo || exit 1

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
source install/setup.bash
colcon build --packages-select common_msgs

# launch gazebo
ros2 launch ros_gz_example_bringup diff_drive.launch.py & sleep 10

# launch slam_toolbox mapper
ros2 launch slam_toolbox online_async_launch.py slam_params_file:=src/ros_gz_example_bringup/config/mapper_params_online_async.yaml use_sim_time:=true   scan_topic:=/scan   base_frame:=limo/base_footprint   odom_frame:=limo/odom & sleep 5

# launch nav2
ros2 launch nav2_bringup navigation_launch.py   params_file:=src/ros_gz_example_bringup/config/nav2_params.yaml use_sim_time:=true   autostart:=true & sleep 10

# launch rviz
LD_PRELOAD=/lib/x86_64-linux-gnu/libpthread.so.0 rviz2
