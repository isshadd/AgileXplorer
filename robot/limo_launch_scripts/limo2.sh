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
ros2 launch limo_bringup limo_start.launch.py pub_odom_tf:=false id:=2
