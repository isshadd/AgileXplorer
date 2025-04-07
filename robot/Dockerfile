FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ROS_DOMAIN_ID=102
ENV GZ_VERSION=fortress

RUN apt-get update && apt-get upgrade -y

RUN apt-get install -y \
    lsb-release \
    wget \
    curl \
    gnupg \
    python3-pip \
    git \
    software-properties-common \
    mesa-utils \
    libglu1-mesa-dev \
    freeglut3-dev \
    mesa-common-dev \
    tmux \
    nano \
    locales

RUN locale-gen en_US en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

RUN curl -fsSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" > /etc/apt/sources.list.d/ros2.list && \
    apt-get update && \
    apt-get install -y ros-humble-desktop

RUN pip3 install -U vcstool colcon-common-extensions rosdep

# Add OSRF (Gazebo) GPG key and repository
RUN gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-key 67170598AF249743 && \
    gpg --export 67170598AF249743 | gpg --dearmor -o /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" > /etc/apt/sources.list.d/gazebo-stable.list && \
    apt-get update && \
    apt-get install -y ignition-fortress


RUN rosdep init && rosdep update

RUN apt-get install -y \
    ros-humble-ros-gz-bridge \
    ros-humble-ros-gz-sim \
    ros-humble-slam-toolbox \
    ros-humble-navigation2 \
    ros-humble-nav2-bringup \
    ros-humble-rviz2

WORKDIR /root/ws
COPY ./gazebo ./gazebo
COPY ./robot ./robot
COPY ./robot_gazebo_start2.sh ./robot_gazebo_start2.sh

RUN /bin/bash -c "source /opt/ros/humble/setup.bash && \
    cd /root/ws/gazebo && colcon build && \
    cd /root/ws/robot && colcon build"

RUN echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc

RUN chmod +x /root/ws/robot_gazebo_start2.sh

ENV DISPLAY=:0

CMD ["bash", "/root/ws/robot_gazebo_start2.sh"]

