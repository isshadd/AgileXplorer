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
    # Get package directories
    description_pkg = get_package_share_directory('ros_gz_example_description')
    
    # Launch Arguments
    use_sim_time = LaunchConfiguration('use_sim_time', default='true')
    
    # Gazebo world launch
    gazebo = ExecuteProcess(
        cmd=['ign', 'gazebo', '-r', '-v', '4', '--gui-config', ''],
        output='screen'
    )
    
    # Robot spawning locations
    spawn_robot1 = Node(
        package='ros_gz_sim',
        executable='create',
        output='screen',
        arguments=['-name', 'limo_ackerman1',
                  '-x', '0.0',
                  '-y', '0.0',
                  '-z', '0.1',
                  '-file', os.path.join(description_pkg, 'models', 'limo_ackerman1', 'model.sdf')],
    )
    
    spawn_robot2 = Node(
        package='ros_gz_sim',
        executable='create',
        output='screen',
        arguments=['-name', 'limo_ackerman2',
                  '-x', '1.0',
                  '-y', '0.0',
                  '-z', '0.1',
                  '-file', os.path.join(description_pkg, 'models', 'limo_ackerman2', 'model.sdf')],
    )
    
    # Bridge between Gazebo and ROS
    bridge_config = os.path.join(
        get_package_share_directory('ros_gz_example_gazebo'),
        'config',
        'bridge.yaml'
    )
    
    bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        parameters=[{
            'config_file': bridge_config,
            'qos_overrides./tf_static.publisher.durability': 'transient_local',
        }],
        remappings=[
            ('/world/empty/model/limo_ackerman1/tf', '/tf'),
            ('/world/empty/model/limo_ackerman2/tf', '/tf'),
        ],
        output='screen'
    )
    
    # Launch them all!
    return LaunchDescription([
        DeclareLaunchArgument(
            'use_sim_time',
            default_value='true',
            description='Use simulation (Gazebo) clock if true'),
        gazebo,
        spawn_robot1,
        spawn_robot2,
        bridge,
    ])
