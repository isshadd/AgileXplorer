# /bin/bash
cd gazebo2
export LIBGL_ALWAYS_SOFTWARE=1
source /opt/ros/humble/setup.bash
source install/setup.bash
colcon build --cmake-args -DBUILD_TESTING=ON
source install/setup.bash
ros2 launch ros_gz_example_bringup diff_drive.launch.py