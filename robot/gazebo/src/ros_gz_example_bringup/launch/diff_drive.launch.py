import os
import subprocess
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

def generate_launch_description():
    robot_count_arg = DeclareLaunchArgument(
        'robot_count',
        default_value='1',
        description='Number of robots to spawn in the simulation',
    )

    robot_count = LaunchConfiguration('robot_count')

    pkg_project_bringup = get_package_share_directory('ros_gz_example_bringup')
    pkg_project_gazebo = get_package_share_directory('ros_gz_example_gazebo')
    pkg_project_description = get_package_share_directory('ros_gz_example_description')
    pkg_ros_gz_sim = get_package_share_directory('ros_gz_sim')

    def launch_setup(context, *args, **kwargs):
        count = int(robot_count.perform(context))
        robot_names = [f"limo{i+1}" for i in range(count)]

        random_generator_script = os.path.join(pkg_project_bringup, 'launch', 'random_generator.py')
        subprocess.run(["python3", random_generator_script, str(count)], check=True)
        random_world_path = os.path.join(pkg_project_bringup, 'launch', 'random_world.sdf')

        gz_sim = IncludeLaunchDescription(
            PythonLaunchDescriptionSource(
                os.path.join(pkg_ros_gz_sim, 'launch', 'gz_sim.launch.py')),
            launch_arguments={'gz_args': random_world_path}.items(),
        )

        nodes = []
        for i, robot_name in enumerate(robot_names):
            robot_sdf = f'limo{i+1}.sdf'
            diff_drive_dir = f'limo_diff_drive{i+1}'
            sdf_file = os.path.join(pkg_project_description, 'models', diff_drive_dir, robot_sdf)
            with open(sdf_file, 'r') as f:
                robot_desc = f.read()

            bridge_config = f'ros_gz_example_bridge{i+1}.yaml'
            bridge = Node(
                package="ros_gz_bridge",
                executable="parameter_bridge",
                parameters=[
                    {
                        "config_file": os.path.join(pkg_project_bringup, "config", bridge_config),
                        "qos_overrides./tf_static.publisher.durability": "transient_local",
                        "expand_gz_topic_names": True,
                    }
                ],
                output="screen",
            )
            nodes.append(bridge)

        return [gz_sim] + nodes

    from launch.actions import OpaqueFunction
    return LaunchDescription([
        robot_count_arg,
        OpaqueFunction(function=launch_setup)
    ])
