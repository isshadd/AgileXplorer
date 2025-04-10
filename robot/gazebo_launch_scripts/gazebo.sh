# /bin/bash

cd ..
cd gazebo

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
source install/setup.bash
colcon build
source install/setup.bash
ros2 launch ros_gz_example_bringup diff_drive.launch.py robot_count:=2
