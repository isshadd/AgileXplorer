#!/bin/bash

cd ../gazebo || exit 1

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
source install/setup.bash
colcon build # --packages-select common_msgs
source install/setup.bash

# launch gazebo
ros2 launch ros_gz_example_bringup diff_drive.launch.py & sleep 10

# launch slam_toolbox mapper
ros2 launch ros_gz_example_bringup map.launch.py use_sim_time:=true & sleep 5

# launch nav2
ros2 launch ros_gz_example_bringup navigation2.launch.py use_sim_time:=true   autostart:=true & sleep 10

# launch rviz
LD_PRELOAD=/lib/x86_64-linux-gnu/libpthread.so.0 rviz2
