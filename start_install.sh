#!/bin/bash

set -e

export DEBIAN_FRONTEND=noninteractive
export GZ_VERSION=fortress
export LANG=en_US.UTF-8
export LANGUAGE=en_US:en
export LC_ALL=en_US.UTF-8

sudo apt-get update && sudo apt-get upgrade -y

sudo apt-get install -y \
    curl wget git lsb-release gnupg2 sudo nano tmux \
    software-properties-common python3 python3-pip \
    build-essential mesa-utils libglu1-mesa-dev freeglut3-dev mesa-common-dev \
    locales x11-xserver-utils ca-certificates \
    nodejs

pip3 install -U colcon-common-extensions

sudo locale-gen en_US en_US.UTF-8

sudo curl -fsSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/ros2.list

sudo apt-get update
sudo apt-get install -y ros-humble-desktop \
    ros-humble-navigation2 ros-humble-nav2-bringup ros-humble-slam-toolbox \
    ros-humble-rviz2 ros-humble-ros-gz-bridge ros-humble-ros-gz-sim

source /opt/ros/humble/setup.bash

sudo gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-key 67170598AF249743
sudo gpg --export 67170598AF249743 | sudo gpg --dearmor -o /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/gazebo-stable.list
sudo apt-get update
sudo apt-get install -y ignition-fortress

export NVM_DIR="$HOME/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20

npm install -g @nestjs/cli @angular/cli@19.1.5
pip3 install --force-reinstall empy==3.3.4
