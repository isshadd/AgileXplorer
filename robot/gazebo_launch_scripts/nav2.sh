# /bin/bash

cd ..
cd gazebo

export ROS_DOMAIN_ID=102
source /opt/ros/humble/bash.setup
source install/setup.bash
ros2 launch ros_gz_example_bringup navigation2.launch.py params_file:=src/ros_gz_example_bringup/config/nav2_config1.yaml           use_sim_time:=true   autostart:=true
