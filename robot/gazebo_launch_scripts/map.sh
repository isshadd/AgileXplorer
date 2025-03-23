# /bin/bash

cd ..
cd gazebo

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
source install/setup.bash
ros2 launch ros_gz_example_bringup map.launch.py use_sim_time:=true
