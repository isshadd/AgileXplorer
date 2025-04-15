# /bin/bash

export ROS_DOMAIN_ID=102
source /opt/ros/humble/setup.bash
pacmd set-default-sink alsa_output.usb-0c76_USB_PnP_Audio_Device-00.analog-stereo
sudo chmod 666 /dev/ttyTHS1

cd limo || exit 1

source install/setup.bash
colcon build 
source install/setup.bash

ros2 launch limo_bringup limo_start.launch.py id:=limo2 pub_odom_tf:=false & sleep 7
ros2 launch limo_bringup cartographer2.launch.py id:=limo2 & sleep 5
#ros2 launch limo_bringup navigation22.launch.py id:=limo2

cd ../robot
source install/setup.bash
colcon build
source install/setup.bash

ros2 launch robot robot.launch.py id:=limo2