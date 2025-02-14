from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration

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
    
    ld = LaunchDescription()
    ld.add_action(robot_speed_arg)
    ld.add_action(move_controller_node)
    ld.add_action(communication_controller_node)
    ld.add_action(identify_node)

    return ld
