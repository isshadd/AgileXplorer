# /bin/bash

cd ..
cd gazebo

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
ros2 launch nav2_bringup navigation_launch.py   params_file:=src/ros_gz_example_bringup/config/nav2_params.yaml use_sim_time:=true   autostart:=true