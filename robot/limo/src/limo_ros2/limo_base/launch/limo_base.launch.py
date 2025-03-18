import os
import launch
import launch_ros

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():

    id_arg = DeclareLaunchArgument(
        'id',
        default_value='102robot1',
        description='Namespace ID for the robot'
    )

    port_name_arg = DeclareLaunchArgument('port_name', default_value='ttyTHS1',
                                         description='usb bus name, e.g. ttyTHS1')
    odom_frame_arg = DeclareLaunchArgument('odom_frame', default_value='odom',
                                           description='Odometry frame id')
    base_link_frame_arg = DeclareLaunchArgument('base_frame', default_value='base_link',
                                                description='Base link frame id')
    odom_topic_arg = DeclareLaunchArgument('odom_topic_name', default_value='odom',
                                           description='Odometry topic name')
    odom_tf_arg = DeclareLaunchArgument('pub_odom_tf', default_value='True',
                                           description='Odometry topic name')

    # is_scout_mini_arg = DeclareLaunchArgument('is_scout_mini', default_value='false',
    #                                       description='Scout mini model')
    # is_omni_wheel_arg = DeclareLaunchArgument('is_omni_wheel', default_value='false',
    #                                       description='Scout mini omni-wheel model')

    # simulated_robot_arg = DeclareLaunchArgument('simulated_robot', default_value='false',
    #                                                description='Whether running with simulator')
    sim_control_rate_arg = DeclareLaunchArgument('control_rate', default_value='50',
                                                 description='Simulation control loop update rate')
                                                 
    initial_yaw_offset_arg = DeclareLaunchArgument('initial_yaw_offset', default_value='37.5',
                                                    description='Initial yaw offset in degrees')
    
    limo_base_node = launch_ros.actions.Node(
        package='limo_base',
        executable='limo_base',  #foxy executable='limo_base',
        output='screen',
        emulate_tty=True,
        namespace=LaunchConfiguration('id'),
        remappings=[
            ('/cmd_vel', ['/cmd_vel']),
            ('/imu', [ '/', LaunchConfiguration('id'), '/imu']),
            ('/limo_status', [ '/', LaunchConfiguration('id'), '/limo_status']),
            ('/odom', [ '/', LaunchConfiguration('id'), '/odom']),
            ('/parameter_events', [ '/', LaunchConfiguration('id'), '/parameter_events']),
            ('/rosout', [ '/', LaunchConfiguration('id'), '/rosout']),
            ('/tf', [ '/', LaunchConfiguration('id'), '/tf']),
        ],
        parameters=[{
                # 'use_sim_time': launch.substitutions.LaunchConfiguration('use_sim_time'),
                'port_name': launch.substitutions.LaunchConfiguration('port_name'),                
                'odom_frame': launch.substitutions.LaunchConfiguration('odom_frame'),
                'base_frame': launch.substitutions.LaunchConfiguration('base_frame'),
                'odom_topic_name': launch.substitutions.LaunchConfiguration('odom_topic_name'),
                # 'is_scout_mini': launch.substitutions.LaunchConfiguration('is_scout_mini'),
                # 'is_omni_wheel': launch.substitutions.LaunchConfiguration('is_omni_wheel'),
                # 'simulated_robot': launch.substitutions.LaunchConfiguration('simulated_robot'),
                'pub_odom_tf': launch.substitutions.LaunchConfiguration('pub_odom_tf'),
                'control_rate': launch.substitutions.LaunchConfiguration('control_rate'),
                'initial_yaw_offset': launch.substitutions.LaunchConfiguration('initial_yaw_offset'),
        }])

    return LaunchDescription([
        id_arg,
        port_name_arg,        
        odom_frame_arg,
        base_link_frame_arg,
        odom_topic_arg,
        odom_tf_arg,
        # is_scout_mini_arg,
        # is_omni_wheel_arg,
        # simulated_robot_arg,
        sim_control_rate_arg,
        initial_yaw_offset_arg,
        limo_base_node
    ])
