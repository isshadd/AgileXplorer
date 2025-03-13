import os
import subprocess  # pour lancer le script Python
from ament_index_python.packages import get_package_share_directory

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution

from launch_ros.actions import Node

def generate_launch_description():
    # Configure ROS nodes for launch

    id_arg = DeclareLaunchArgument(
        'id',
        default_value='robot1_102',
        description='Namespace ID for the robot'
    )

    # Setup project paths
    pkg_project_bringup = get_package_share_directory('ros_gz_example_bringup')
    pkg_project_gazebo = get_package_share_directory('ros_gz_example_gazebo')
    pkg_project_description = get_package_share_directory('ros_gz_example_description')
    pkg_ros_gz_sim = get_package_share_directory('ros_gz_sim')

    # 1) Appeler le script random_generator.py avant de lancer Gazebo
    # local path vers random_generator.py
    random_generator_script = os.path.join(pkg_project_bringup, 'launch', 'random_generator.py')

    # On exécute le script
    subprocess.run(["python3", random_generator_script], check=True)

    # 2) Maintenant on a "random_world.sdf" tout prêt
    #    On indique à gz_sim de lancer ce nouveau fichier
    random_world_path = os.path.join(pkg_project_bringup, 'launch', 'random_world.sdf')
    

    gz_sim = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(pkg_ros_gz_sim, 'launch', 'gz_sim.launch.py')),
        launch_arguments={'gz_args': random_world_path}.items(),
    )

    # 3) Le reste comme avant
    sdf_file = os.path.join(pkg_project_description, 'models', 'limo_diff_drive', 'model.sdf')
    with open(sdf_file, 'r') as infp:
        robot_desc = infp.read()

    # Node qui publie l’URDF (ou SDF) sur /robot_description
    robot_state_publisher = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        name='robot_state_publisher',
        output='both',
        parameters=[
            {'use_sim_time': True},
            {'robot_description': robot_desc},
        ]
    )

    bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        namespace=LaunchConfiguration('id'),
        remappings=[
            ('/cmd_vel', [ '/', LaunchConfiguration('id'), '/cmd_vel']),
            ('/imu', [ '/', LaunchConfiguration('id'), '/imu']),
            ('/limo_status', [ '/', LaunchConfiguration('id'), '/limo_status']),
            ('/odom', [ '/', LaunchConfiguration('id'), '/odom']),
            ('/parameter_events', [ '/', LaunchConfiguration('id'), '/parameter_events']),
            ('/rosout', [ '/', LaunchConfiguration('id'), '/rosout']),
            ('/tf', [ '/', LaunchConfiguration('id'), '/tf']),
        ],
        parameters=[{
            'config_file': os.path.join(pkg_project_bringup, 'config', 'ros_gz_example_bridge.yaml'),
            'qos_overrides./tf_static.publisher.durability': 'transient_local',
        }],
        output='screen'
    )

    return LaunchDescription([
        id_arg,
        gz_sim,
        bridge,
        robot_state_publisher,
    ])
