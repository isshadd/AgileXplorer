# /bin/bash

# Installation des dépendances GTK nécessaires
sudo apt-get update && sudo apt-get install -y python3-gi gir1.2-appindicator3-0.1

# Configuration de l'environnement
export ROS_DOMAIN_ID=102
export SIMULATION=false

source /opt/ros/humble/setup.bash
pacmd set-default-sink alsa_output.usb-0c76_USB_PnP_Audio_Device-00.analog-stereo
sudo chmod 666 /dev/ttyTHS1

cd limo || exit 1

source install/setup.bash
colcon build 
source install/setup.bash

ros2 launch limo_bringup limo_start.launch.py id:=limo1 pub_odom_tf:=false & sleep 7
ros2 launch limo_bringup cartographer.launch.py id:=limo1 & sleep 5
ros2 launch limo_bringup navigation2.launch.py id:=limo1 & sleep 7

cd ../robot
source install/setup.bash
colcon build
source install/setup.bash

ros2 launch robot robot.launch.py id:=limo1 & sleep 5
ros2 launch merge_map merge_map_launch.py use_sim_time:=false

