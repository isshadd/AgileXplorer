# /bin/bash

pacmd set-default-sink alsa_output.usb-0c76_USB_PnP_Audio_Device-00.analog-stereo
export ROS_DOMAIN_ID=102
sudo chmod 666 /dev/ttyTHS1

cd robot
source /opt/ros/humble/setup.bash
source install/setup.bash
colcon build
source install/setup.bash
#!/bin/bash
ros2 launch robot robot.launch.py id:=robot1_102 &
ros2 launch robot robot.launch.py id:=robot2_102