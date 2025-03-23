import os

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory


def generate_launch_description():
    pkg_share = get_package_share_directory('ros_gz_example_bringup')
    use_sim_time = LaunchConfiguration("use_sim_time")
    slam_params_file = LaunchConfiguration("slam_params_file")

    declare_use_sim_time_argument = DeclareLaunchArgument(
        "use_sim_time", default_value="true", description="Use simulation/Gazebo clock"
    )
    declare_slam_params_file_cmd = DeclareLaunchArgument(
        "slam_params_file",
        default_value=os.path.join(pkg_share, "config", "slam_config1.yaml"),
        description="Path to SLAM parameters file",
    )

    start_async_slam_toolbox_node = Node(
        parameters=[slam_params_file, {"use_sim_time": use_sim_time}],
        package="slam_toolbox",
        executable="async_slam_toolbox_node",
        name="slam_toolbox",
        output="screen",
        remappings=[("/map", "/limo1/map")],
    )

    declare_slam_params_file_cmd2 = DeclareLaunchArgument(
        "slam_params_file",
        default_value=os.path.join(pkg_share, "config", "slam_config2.yaml"),
        description="Path to SLAM parameters file",
    )

    start_async_slam_toolbox_node2 = Node(
        parameters=[slam_params_file, {"use_sim_time": use_sim_time}],
        package="slam_toolbox",
        executable="async_slam_toolbox_node",
        name="slam_toolbox",
        output="screen",
        remappings=[("/map", "/limo2/map")],
    )

    ld = LaunchDescription()

    ld.add_action(declare_use_sim_time_argument)
    ld.add_action(declare_slam_params_file_cmd)
    ld.add_action(start_async_slam_toolbox_node)
    ld.add_action(declare_slam_params_file_cmd2)
    ld.add_action(start_async_slam_toolbox_node2)
    return ld