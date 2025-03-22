# /bin/bash

cd ..
cd gazebo

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
source install/setup.bash
#ros2 launch slam_toolbox online_async_launch.py slam_params_file:=src/ros_gz_example_bringup/config/slam_config1.yaml #use_sim_time:=true   scan_topic:=/scan   base_frame:=limo1/base_footprint   odom_frame:=limo1/odom
# use simtime est à false dans la vrai vie !!!!!

ros2 launch ros_gz_example_bringup map.launch.py slam_params_file:=src/ros_gz_example_bringup/config/slam_config1.yaml use_sim_time:=true   scan_topic:=/robot1_102/scan   base_frame:=limo1/base_footprint   odom_frame:=limo1/odom
