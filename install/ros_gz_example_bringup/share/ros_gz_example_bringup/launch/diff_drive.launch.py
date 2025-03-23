import os
import subprocess
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node

def generate_launch_description():
    # Define robot namespaces
    robot_names = ['limo1', 'limo2'] 
    robot_models = ['limo1', 'limo2']

    # Setup paths
    pkg_project_bringup = get_package_share_directory('ros_gz_example_bringup')
    pkg_project_gazebo = get_package_share_directory('ros_gz_example_gazebo')
    pkg_project_description = get_package_share_directory('ros_gz_example_description')
    pkg_ros_gz_sim = get_package_share_directory('ros_gz_sim')

    # Generate random world (same as before)
    random_generator_script = os.path.join(pkg_project_bringup, 'launch', 'random_generator.py')
    subprocess.run(["python3", random_generator_script], check=True)
    random_world_path = os.path.join(pkg_project_bringup, 'launch', 'random_world.sdf')

    # Launch Gazebo
    gz_sim = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(pkg_ros_gz_sim, 'launch', 'gz_sim.launch.py')),
        launch_arguments={'gz_args': random_world_path}.items(),
    )

    # Create nodes for each robot
    nodes = []
    for i, (robot_name, model_name) in enumerate(zip(robot_names, robot_models)):
        # Robot State Publisher (namespaced)
        robot_sdf = f'limo{i+1}.sdf'
        diff_drive_dir = f'limo_diff_drive{i+1}'
        sdf_file = os.path.join(pkg_project_description, 'models', diff_drive_dir, robot_sdf)
        with open(sdf_file, 'r') as f:
            robot_desc = f.read()

        # Parameter Bridge 
        bridge_config = f'ros_gz_example_bridge{i+1}.yaml'
        bridge = Node(
            package="ros_gz_bridge",
            executable="parameter_bridge",
            parameters=[
                {
                    "config_file": os.path.join(
                        pkg_project_bringup,
                        "config",
                        bridge_config,
                    ),
                    "qos_overrides./tf_static.publisher.durability": "transient_local",
                    "expand_gz_topic_names": True,
                }
            ],
            output="screen",
        )
        nodes.append(bridge)

    # slam_robot1 = IncludeLaunchDescription(
    #     PythonLaunchDescriptionSource([
    #         PathJoinSubstitution([
    #             get_package_share_directory('ros_gz_example_bringup'),
    #             'launch/map.launch.py'
    #         ])
    #     ]),
    #     launch_arguments={
    #         # 'namespace': 'limo1',
    #         'slam_params_file': PathJoinSubstitution([
    #             get_package_share_directory('ros_gz_example_bringup'),
    #             'config/slam_config1.yaml'
    #         ])
    #     }.items()
    # )

    return LaunchDescription([gz_sim] + nodes)