from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.substitutions import FindPackageShare

def generate_launch_description():

    id_arg = DeclareLaunchArgument(
        'id',
        default_value='robot1_102',
        description='Namespace ID for the robot'
    )

    robot_speed_arg = DeclareLaunchArgument(
        'robot_speed',
        default_value='0.5', 
        description='Speed parameter for the move_controller node'
    )
    nav2_bringup = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            PathJoinSubstitution([
                FindPackageShare('nav2_bringup'),
                'launch',
                'bringup_launch.py'
            ])
        ]),
        launch_arguments={
            'namespace': LaunchConfiguration('id'),
            'use_sim_time': 'false',
            'params_file': PathJoinSubstitution([
                FindPackageShare('exploration'),  # TODO : remplacer par un package contenant 'nav2_params.yaml'
                'config',
                'nav2_params.yaml'  # You need to create this config file
            ]),
            'slam': 'True',  # Enable SLAM with LiDAR
            'map': '',  # No pre-existing map
            'autostart': 'true'
        }.items()
    )
    static_tf_node = Node(
    package='tf2_ros',
    executable='static_transform_publisher',
    name='static_transform_publisher',
    output='screen',
    arguments=[
        '--x', '0', '--y', '0', '--z', '0',
        '--roll', '0', '--pitch', '0', '--yaw', '0',
        '--frame-id', [LaunchConfiguration('id'), '/base_link'],
        '--child-frame-id', [LaunchConfiguration('id'), '/lidar_frame']
    ]
)
    move_controller_node = Node(
        package='control',
        executable='move_controller',
        name='move_controller',
        output='screen',
        parameters=[{'speed': LaunchConfiguration('robot_speed')}, {'robot_id': LaunchConfiguration('id')}],
        remappings=[('/cmd_vel', [ '/', LaunchConfiguration('id'), '/cmd_vel'])]
    )
    communication_controller_node = Node(
        package='communication',
        executable='communication_controller',
        name='communication_controller',
        output='screen',
        parameters=[{'robot_id': LaunchConfiguration('id')}],
        remappings=[('/messages', [ '/', LaunchConfiguration('id'), '/messages'])]
    )
    identify_node = Node(
        package='identification',
        executable='identify_node',
        name='identify_node',
        output='screen',
        parameters=[{'robot_id': LaunchConfiguration('id')}],
        remappings=[('/identify', [ '/', LaunchConfiguration('id'), '/identify'])]
    )
    exploration_controller_node = Node(
        package='exploration',
        executable='exploration_controller',
        name='exploration_controller',
        output='screen',
        parameters=[{'robot_id': LaunchConfiguration('id')}],
        remappings=[('/exploration', [ '/', LaunchConfiguration('id'), '/exploration']),
                    ('/lydar', [ '/', LaunchConfiguration('id'), '/lydar']),
                    ('/navigate_to_pose', [ '/', LaunchConfiguration('id'), '/navigate_to_pose'])]
    )
    
    ld = LaunchDescription()
    ld.add_action(robot_speed_arg)
    ld.add_action(move_controller_node)
    ld.add_action(communication_controller_node)
    ld.add_action(identify_node)
    ld.add_action(exploration_controller_node)
    ld.add_action(nav2_bringup)
    ld.add_action(static_tf_node)
    
    return ld
