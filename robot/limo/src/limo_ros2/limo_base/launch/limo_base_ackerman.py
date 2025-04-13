import os
import launch
import launch_ros

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess, IncludeLaunchDescription
from launch.substitutions import LaunchConfiguration
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node

def generate_launch_description():
    # Get the package directories
    limo_base_dir = get_package_share_directory('limo_base')
    nav2_bringup_dir = get_package_share_directory('nav2_bringup')

    # Launch Arguments
    id_arg = DeclareLaunchArgument(
        'id',
        default_value='102robot1',
        description='Namespace ID for the robot'
    )

    port_name_arg = DeclareLaunchArgument(
        'port_name', 
        default_value='ttyTHS1',
        description='usb bus name, e.g. ttyTHS1'
    )

    nav_params_path = os.path.join(
        limo_base_dir,
        'param',
        'nav2_ackermann_params.yaml'
    )

    # Base Node with Ackermann Configuration
    limo_base_node = launch_ros.actions.Node(
        package='limo_base',
        executable='limo_base',
        output='screen',
        emulate_tty=True,
        namespace=LaunchConfiguration('id'),
        remappings=[
            ('/cmd_vel', ['/cmd_vel']),
            ('/imu', ['/', LaunchConfiguration('id'), '/imu']),
            ('/limo_status', ['/', LaunchConfiguration('id'), '/limo_status']),
            ('/odom', ['/', LaunchConfiguration('id'), '/odom']),
            ('/parameter_events', ['/', LaunchConfiguration('id'), '/parameter_events']),
            ('/rosout', ['/', LaunchConfiguration('id'), '/rosout']),
            ('/tf', ['/', LaunchConfiguration('id'), '/tf']),
        ],
        parameters=[{
            'port_name': LaunchConfiguration('port_name'),
            'model_type': 'ackermann',
            'wheel_base': 0.2,
            'wheel_track': 0.172,
            'steering_angle_max': 0.52,  # ~30 degrees
            'use_ackermann_mode': True
        }]
    )

    # Robot State Publisher for Ackermann Model
    robot_state_publisher = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        name='robot_state_publisher',
        output='screen',
        parameters=[{
            'robot_description': 'limo_ackerman',
            'use_sim_time': True
        }]
    )

    # Navigation Stack with Ackermann Parameters
    nav2_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(nav2_bringup_dir, 'launch', 'navigation_launch.py')
        ),
        launch_arguments={
            'params_file': nav_params_path,
            'use_sim_time': 'True'
        }.items()
    )

    return LaunchDescription([
        id_arg,
        port_name_arg,
        limo_base_node,
        robot_state_publisher,
        nav2_launch
    ])
