#!/bin/bash

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash

cd gazebo || exit 1
source install/setup.bash
colcon build 
source install/setup.bash

ros2 launch ros_gz_example_bringup diff_drive.launch.py robot_count:=1 & sleep 5
ros2 launch ros_gz_example_bringup map.launch.py use_sim_time:=true & sleep 5
ros2 launch ros_gz_example_bringup navigation2.launch.py namespace:=limo1 use_sim_time:=true   autostart:=true & sleep 7
LD_PRELOAD=/lib/x86_64-linux-gnu/libpthread.so.0 rviz2 & sleep 7

cd ../robot
source install/setup.bash
colcon build
source install/setup.bash

ros2 launch robot robot.launch.py id:=limo1