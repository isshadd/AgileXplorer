# /bin/bash

cd ..
cd limo

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
source install/setup.bash
ros2 launch limo_bringup navigation2.launch.py
# ros2 launch limo_bringup bringup_launch.py slam:=True
