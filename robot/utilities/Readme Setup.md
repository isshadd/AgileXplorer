# Running on the Jetson Nano:
```shell
# download https://github.com/dusty-nv/jetson-containers if needed
# Create local workspace
mkdir -p ~/agx_workspace
cd ~/agx_workspace
# lone the project
git clone https://github.com/agilexrobotics/limo_ros2.git src


# Début 

source /opt/ros/humble/setup.bash

# Install essential packages
sudo apt-get update \
    && sudo apt-get install -y --no-install-recommends \
    libusb-1.0-0 \
    udev \
    apt-transport-https \
    ca-certificates \
    curl \
    swig \
    software-properties-common \
    python3-pip

sudo apt install ros-humble-gazebo-* # TODO : à changer pour l'ancien gazeboo -> gazebo ignition fortress
sudo apt-get install ros-humble-joint-state-publisher-gui 
sudo apt-get install ros-humble-rqt-robot-steering 

# Install ydlidar driver
git clone https://github.com/YDLIDAR/YDLidar-SDK.git &&\
    mkdir -p YDLidar-SDK/build && \
    cd YDLidar-SDK/build &&\
    cmake ..&&\
    make &&\
    sudo make install &&\
    cd .. &&\
    cd .. && rm -rf YDLidar-SDK

# Compile limo_ros2 packages 
sudo cp -r /opt/ros/humble/include/tf2_geometry_msgs/tf2_geometry_msgs /usr/local/include/
colcon build
source install/setup.bash

```

### dockerfile构建docker环境

如果您对docker的使用有一定的了解，代码仓库中已经包含了dockerfile，您可以运行docker build命令直接构建，当然我们更推荐使用我们编写的自动化脚本来完成整个过程：

``【推荐】使用 VS Code remote 插件 连接到 limo，打开 ~/agx_workspace 后在菜单中选择 reopen in container``
 ``[Recommend] Login the limo via VS Code remote plugin, open ~/agx_workspace.Then select reopen in container in the menu``

``运行自动配置脚本 Or running automatically setup script``

```shell
cd ~/agx_workspace/src
chmod +x setup.sh
./docker_setup.sh
```
然后按照提示进行操作 Then follow the prompts

### 直接拉取docker镜像

我们还将所需的镜像打包上传到了dockerhub网站，您可以直接运行下面的命令：

```bash
docker pull lagrangeluo/limo_ros2:v1
```

当镜像拉取完毕后，查看镜像，如果列表中出现了镜像名称，则说明pull成功了

```bash
agilex@agilex-desktop:~$ docker image list
REPOSITORY                                                         TAG        IMAGE ID       CREATED          SIZE
lagrangeluo/limo_ros2                                              v1         224540b5b168   11 minutes ago   7.57GB
```

通过容器启动镜像：

```bash
docker run --network=host \
      -d
      -v=/dev:/dev \
      --privileged \
      --device-cgroup-rule="a *:* rmw" \
      --volume=/tmp/.X11-unix:/tmp/.X11-unix \
      -v $XAUTH:$XAUTH -e XAUTHORITY=$XAUTH \
      --runtime nvidia
      --gpus=all \
      -w=/workspace \
      --name limo_dev \
      -e LIBGL_ALWAYS_SOFTWARE="1" \
      -e DISPLAY=${DISPLAY} \
      --restart=always \
      -v ~/agx_workspace:/home/limo_ros1_ws \
      lagrangeluo/limo_ros2:v1 \

```

当使用任意一种方式成功创建容器之后，便可以在容器环境下运行代码了。

# 导航 Navigation

```shell
rviz2
## 启动底盘 start the chassis
ros2 launch limo_bringup limo_start.launch.py
sleep 2

## 启动导航 start navigation
ros2 launch limo_bringup navigation2.launch.py
```

# 建图 start positioning

```shell
rviz2
ros2 launch limo_bringup limo_start.launch.py
ros2 launch build_map_2d revo_build_map_2d.launch.py
#上面三条指令启动之后，用遥控器控制车子行走 After the above three command are activated use a separate screen to control the car
```


# 键盘控制 keyboard control

```shell
ros2 launch limo_bringup limo_start.launch.py
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

# 仿真 Simulation : OLD Simulation

## 四轮差速模式  Four wheel differential mode

rviz2中显示模型  Display the model in rviz2

```
ros2 launch limo_description display_models_diff.launch.py 
```

gazebo中显示模型 Run the simulation in gazebo

```
ros2 launch limo_description gazebo_models_diff.launch.py 
```

启动键盘控制节点控制limo Start keyboard teleop to control Limo

```
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

## 阿克曼模式  Ackermann Model

开发中  In development





