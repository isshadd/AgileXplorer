from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.substitutions import LaunchConfiguration
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.actions import GroupAction
from launch_ros.actions import PushRosNamespace

def generate_launch_description():
    # Instance pour robot1
    robot1 = GroupAction([
        PushRosNamespace('limo1'),
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(['path/to/robot.launch.py']),
            launch_arguments={'id': 'limo1', 'robot_speed': '0.5'}.items()
        )
    ])

    # Instance pour robot2
    robot2 = GroupAction([
        PushRosNamespace('limo2'),
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(['path/to/robot.launch.py']),
            launch_arguments={'id': 'limo2', 'robot_speed': '0.5'}.items()
        )
    ])

    return LaunchDescription([robot1, robot2])
