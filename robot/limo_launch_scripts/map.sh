# /bin/bash

cd ..
cd limo

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
source install/setup.bash
ros2 launch slam_toolbox online_async_launch.py slam_params_file:=src/ros_gz_example_bringup/config/mapper_params_online_async.yaml use_sim_time:=false   scan_topic:=/scan   base_frame:=limo/base_footprint   odom_frame:=limo/odom