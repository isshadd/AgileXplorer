import os
import sys

import launch
import launch_ros.actions
from ament_index_python.packages import get_package_share_directory
from launch.substitutions import LaunchConfiguration


def generate_launch_description():
    ld = launch.LaunchDescription([
        launch.actions.DeclareLaunchArgument(
            name='id',
            default_value='limo1',
            description='Namespace ID for the robot'
        ),
        launch.actions.DeclareLaunchArgument(name='port_name',
                                             default_value='ttyTHS1'),
        launch.actions.DeclareLaunchArgument(name='odom_topic_name',
                                             default_value='odom'),
        launch.actions.DeclareLaunchArgument(name='open_rviz',
                                             default_value='false'),
        launch_ros.actions.Node(
            package='rviz2',
            executable='rviz2',
            name='rviz2',
            on_exit=launch.actions.Shutdown(),
            condition=launch.conditions.IfCondition(
                launch.substitutions.LaunchConfiguration('open_rviz'))),
        launch_ros.actions.Node(
            package='tf2_ros',
            executable='static_transform_publisher',
            name='base_link_to_imu',
            arguments="0.0 0.0 0.0 0.0 0.0 0.0 /base_link /imu_link".split(
                ' ')),
        launch_ros.actions.Node(
            package='tf2_ros',
            executable='static_transform_publisher',
            name='base_link_to_odom',
            arguments="0.0 0.0 0.0 0.0 0.0 0.0 /base_link /odom".split(
                ' ')),
         launch.actions.IncludeLaunchDescription(
             launch.launch_description_sources.PythonLaunchDescriptionSource(
                 os.path.join(get_package_share_directory('limo_base'),
                              'launch/limo_base.launch.py')),
             launch_arguments={
                 'id': LaunchConfiguration('id'),
                 'port_name': LaunchConfiguration('port_name'),
                 'odom_topic_name': LaunchConfiguration('odom_topic_name')
             }.items()),    
         launch.actions.IncludeLaunchDescription(
             launch.launch_description_sources.PythonLaunchDescriptionSource(
                 os.path.join(get_package_share_directory('limo_base'),
                              'launch','open_ydlidar_launch.py')),
             launch_arguments={
                'id': LaunchConfiguration('id')
            }.items())
    ])
    return ld


if __name__ == '__main__':
    generate_launch_description()
