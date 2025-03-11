#!/bin/bash

pacmd set-default-sink alsa_output.usb-0c76_USB_PnP_Audio_Device-00.analog-stereo
export ROS_DOMAIN_ID=102
sudo chmod 666 /dev/ttyTHS1

# Build limo1
(
  cd limo || exit 1
  source /opt/ros/humble/setup.bash
  source install/setup.bash
  colcon build
  source install/setup.bash
  ros2 launch limo_base limo_base.launch.py id:=robot1_102
) &

# Build robot1
(
  cd robot || exit 1
  source install/setup.bash
  colcon build
  source install/setup.bash
  ros2 launch robot robot.launch.py id:=robot1_102
) &

wait