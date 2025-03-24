import os

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory


def generate_launch_description():
    pkg_share = get_package_share_directory('ros_gz_example_bringup')
    use_sim_time = LaunchConfiguration("use_sim_time")
    slam_params_file1 = LaunchConfiguration("slam_params_file1")
    slam_params_file2 = LaunchConfiguration("slam_params_file2")

    declare_use_sim_time_argument = DeclareLaunchArgument(
        "use_sim_time", default_value="true", description="Use simulation/Gazebo clock"
    )

    declare_slam_params_file_cmd1 = DeclareLaunchArgument(
        "slam_params_file1",
        default_value=os.path.join(pkg_share, "config", "slam_config1.yaml"),
        description="Path to SLAM parameters file",
    )
    start_async_slam_toolbox_node1 = Node(
        parameters=[slam_params_file1, {"use_sim_time": use_sim_time}],
        package="slam_toolbox",
        executable="async_slam_toolbox_node",
        name="slam_toolbox",
        output="screen",
        remappings=[
            ("/map", "/limo1/map"),
            ("/map_metadata", "/limo1/map_metadata"),
            ("/slam_toolbox/feedback", "/limo1/slam_toolbox/feedback"),
            ("/slam_toolbox/graph_visualization", "/limo1/slam_toolbox/graph_visualization"),
            ("/slam_toolbox/scan_visualization", "/limo1/slam_toolbox/scan_visualization"),
            ("/slam_toolbox/update", "/limo1/slam_toolbox/update")]
    )
    
    declare_slam_params_file_cmd2 = DeclareLaunchArgument(
        "slam_params_file2",
        default_value=os.path.join(pkg_share, "config", "slam_config2.yaml"),
        description="Path to SLAM parameters file",
    )

    start_async_slam_toolbox_node2 = Node(
        parameters=[slam_params_file2, {"use_sim_time": use_sim_time}],
        package="slam_toolbox",
        executable="async_slam_toolbox_node",
        name="slam_toolbox",
        output="screen",
        remappings=[
            ("/map", "/limo2/map"),
            ("/map_metadata", "/limo2/map_metadata"),
            ("/slam_toolbox/feedback", "/limo2/slam_toolbox/feedback"),
            ("/slam_toolbox/graph_visualization", "/limo2/slam_toolbox/graph_visualization"),
            ("/slam_toolbox/scan_visualization", "/limo2/slam_toolbox/scan_visualization"),
            ("/slam_toolbox/update", "/limo2/slam_toolbox/update")]
    )

    ld = LaunchDescription()

    ld.add_action(declare_use_sim_time_argument)
    ld.add_action(declare_slam_params_file_cmd1)
    ld.add_action(start_async_slam_toolbox_node1)
    ld.add_action(declare_slam_params_file_cmd2)
    ld.add_action(start_async_slam_toolbox_node2)
    return ld