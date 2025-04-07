FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ROS_DOMAIN_ID=102

RUN apt update && apt install -y \
  curl \
  git \
  gnupg2 \
  lsb-release \
  sudo \
  build-essential \
  python3 \
  python3-pip

# Install ROS 2 Humble
RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key | gpg --dearmor -o /usr/share/keyrings/ros-archive-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu jammy main" > /etc/apt/sources.list.d/ros2.list && \
    apt update && \
    apt install -y ros-humble-ros-base

# Source ROS 2
SHELL ["/bin/bash", "-c"]
RUN echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc

# Install Node.js via NVM
ENV NVM_DIR=/root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash && \
    source "$NVM_DIR/nvm.sh" && \
    nvm install 20 && \
    nvm use 20 && \
    nvm alias default 20 && \
    npm install -g @nestjs/cli

WORKDIR /app
COPY . .

# Install Node dependencies
RUN bash -c "source $NVM_DIR/nvm.sh && npm install && \
    npm install rclnodejs && \
    npm install @nestjs/mongoose mongoose && \
    npm install @nestjs/platform-socket.io @nestjs/websockets --legacy-peer-deps && \
    npm install -D @types/mongoose"

CMD bash -c "source /opt/ros/humble/setup.bash && source $NVM_DIR/nvm.sh && npm run start:dev"

