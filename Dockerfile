FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ROS_DOMAIN_ID=102
ENV GZ_VERSION=fortress
ENV NVM_DIR=/root/.nvm
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8
ENV DISPLAY=:0

    RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    curl wget git lsb-release gnupg2 sudo nano tmux \
    software-properties-common python3 python3-pip \
    build-essential mesa-utils libglu1-mesa-dev freeglut3-dev mesa-common-dev \
    locales x11-xserver-utils ca-certificates \
    nodejs npm

RUN pip3 install -U colcon-common-extensions

RUN locale-gen en_US en_US.UTF-8

RUN curl -fsSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" > /etc/apt/sources.list.d/ros2.list && \
    apt-get update && \
    apt-get install -y ros-humble-desktop \
    ros-humble-navigation2 ros-humble-nav2-bringup ros-humble-slam-toolbox \
    ros-humble-rviz2 ros-humble-ros-gz-bridge ros-humble-ros-gz-sim

RUN echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc

RUN gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-key 67170598AF249743 && \
    gpg --export 67170598AF249743 | gpg --dearmor -o /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" > /etc/apt/sources.list.d/gazebo-stable.list && \
    apt-get update && apt-get install -y ignition-fortress

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    nvm install 20 && \
    nvm use 20 && \
    nvm alias default 20 && \
    npm install -g @nestjs/cli @angular/cli@19.1.5

RUN pip3 install --force-reinstall empy==3.3.4

WORKDIR /root/ws
COPY robot ./robot
COPY server ./server
COPY client ./client
COPY start_docker.sh ./start_docker.sh

RUN /bin/bash -c "source /opt/ros/humble/setup.bash"

RUN bash -c "source $NVM_DIR/nvm.sh && \
    cd /root/ws/server && npm install && \
    npm install rclnodejs @nestjs/mongoose mongoose @nestjs/platform-socket.io @nestjs/websockets --legacy-peer-deps && \
    npm install -D @types/mongoose && \
    cd ../client && npm ci && npm install @angular/material @angular/cdk"

RUN chmod +x ./start_docker.sh

CMD ["bash", "/root/ws/start_docker.sh"]

