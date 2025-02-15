from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.substitutions import LaunchConfiguration
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.actions import GroupAction
from launch_ros.actions import PushRosNamespace

def generate_launch_description():
    # Instance pour robot1
    robot1 = GroupAction([
        PushRosNamespace('robot1_102'),
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(['path/to/robot.launch.py']),
            launch_arguments={'id': 'robot1_102', 'robot_speed': '0.5'}.items()
        )
    ])

    # Instance pour robot2
    robot2 = GroupAction([
        PushRosNamespace('robot2_102'),
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(['path/to/robot.launch.py']),
            launch_arguments={'id': 'robot2_102', 'robot_speed': '0.5'}.items()
        )
    ])

    return LaunchDescription([robot1, robot2])
