# /bin/bash

cd ..
cd limo

pacmd set-default-sink alsa_output.usb-0c76_USB_PnP_Audio_Device-00.analog-stereo
export ROS_DOMAIN_ID=102
sudo chmod 666 /dev/ttyTHS1

source /opt/ros/humble/setup.bash
source install/setup.bash
colcon build
source install/setup.bash
ros2 launch limo_bringup limo_start.launch.py pub_odom_tf:=false
# ros2 launch limo_base limo_base.launch.py id:=robot1_102 


# start limo et lidar : ros2 launch limo_bringup limo_start.launch.py pub_odom_tf:=false = start tout le limo at lidar, on peut mettre que ca launch rvis mais fais rien
# start cartographer :  ros2 launch limo_bringup cartographer.launch.py = donne une map avec des cubes apres nav2 et start
# start lidar :         ros2 launch limo_base open_ydlidar_launch.py
# start nav : ros2 navigation2 start rvis et a besoin de limo etja allume
