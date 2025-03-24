#!/usr/bin/env python3

import os

from ament_index_python.packages import get_package_share_directory

from launch import LaunchDescription
from launch.actions import (DeclareLaunchArgument, GroupAction,
                            IncludeLaunchDescription, SetEnvironmentVariable)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PythonExpression
from launch_ros.actions import Node
from launch_ros.actions import PushRosNamespace
from launch_ros.descriptions import ParameterFile
from nav2_common.launch import RewrittenYaml, ReplaceString

def generate_launch_description():
    # Dossier où se trouve nav2_bringup
    bringup_dir = get_package_share_directory('limo_bringup')
    launch_dir = os.path.join(bringup_dir, 'launch')

    # On définit un chemin par défaut pour la map venant de limo_bringup
    # Adaptez si votre map a un autre nom ou un autre chemin.
    default_map_path = os.path.join(
        get_package_share_directory('limo_bringup'),
        'maps'
    )

    # Fichier de configuration RViz par défaut
    rviz_config_dir = os.path.join(
        bringup_dir,
        'rviz',
        'nav2_default_view.rviz'
    )

    # Définition des LaunchConfigurations
    namespace = LaunchConfiguration('namespace')
    use_namespace = LaunchConfiguration('use_namespace')
    slam = LaunchConfiguration('slam')
    map_yaml_file = LaunchConfiguration('map')
    use_sim_time = LaunchConfiguration('use_sim_time')
    params_file = LaunchConfiguration('params_file')
    autostart = LaunchConfiguration('autostart')
    use_composition = LaunchConfiguration('use_composition')
    use_respawn = LaunchConfiguration('use_respawn')
    log_level = LaunchConfiguration('log_level')

    # Remappings TF (pour éviter les noms absolus /tf et /tf_static)
    remappings = [
        ('/tf', 'tf'),
        ('/tf_static', 'tf_static')
    ]

    # Substitutions de paramètres
    param_substitutions = {
        'use_sim_time': use_sim_time,
        'yaml_filename': map_yaml_file
    }

    # Remplacement de la chaîne '<robot_namespace>' par 'namespace'
    params_file_with_ns = ReplaceString(
        source_file=params_file,
        replacements={'limo1': ('/', namespace)},
        condition=IfCondition(use_namespace)
    )

    # On réécrit le fichier YAML avec les substitutions
    configured_params = ParameterFile(
        RewrittenYaml(
            source_file=params_file_with_ns,
            root_key=namespace,
            param_rewrites=param_substitutions,
            convert_types=True
        ),
        allow_substs=True
    )

    # Buffer de logs en mode ligne par ligne
    stdout_linebuf_envvar = SetEnvironmentVariable(
        'RCUTILS_LOGGING_BUFFERED_STREAM', '1'
    )

    # Déclarations des arguments de lancement
    declare_namespace_cmd = DeclareLaunchArgument(
        'namespace',
        default_value='',
        description='Top-level namespace'
    )

    declare_use_namespace_cmd = DeclareLaunchArgument(
        'use_namespace',
        default_value='false',
        description='Whether to apply a namespace to the navigation stack'
    )

    declare_slam_cmd = DeclareLaunchArgument(
        'slam',
        default_value='False',
        description='Whether to run SLAM (True) or use a static map (False)'
    )

    # ***** AJOUT : Valeur par défaut = votre carte "zhiyuan.yaml" *****
    declare_map_yaml_cmd = DeclareLaunchArgument(
        'map',
        default_value=default_map_path,  # <--- on pointe vers la carte par défaut
        description='Full path to map file to load'
    )

    declare_use_sim_time_cmd = DeclareLaunchArgument(
        'use_sim_time',
        default_value='false',
        description='Use simulation clock if true'
    )

    declare_params_file_cmd = DeclareLaunchArgument(
        'params_file',
        # S’il faut pointer par défaut vers navigation2.yaml (de limo_bringup),
        # mettez le chemin complet ici. Vous pouvez aussi le laisser générique
        # si c’est déjà un param par défaut de nav2_bringup.
        default_value=os.path.join(
            bringup_dir,
            'param',
            'navigation2.yaml'
        ),
        description='Full path to the ROS2 parameters file to use for all launched nodes'
    )

    declare_autostart_cmd = DeclareLaunchArgument(
        'autostart',
        default_value='true',
        description='Automatically startup the nav2 stack'
    )

    declare_use_composition_cmd = DeclareLaunchArgument(
        'use_composition',
        default_value='True',
        description='Whether to use composed bringup'
    )

    declare_use_respawn_cmd = DeclareLaunchArgument(
        'use_respawn',
        default_value='False',
        description='Respawn nodes if they crash'
    )

    declare_log_level_cmd = DeclareLaunchArgument(
        'log_level',
        default_value='info',
        description='Log level'
    )

    # GroupAction qui lance l’ensemble
    bringup_cmd_group = GroupAction([
        PushRosNamespace(
            condition=IfCondition(use_namespace),
            namespace=namespace
        ),

        # Container Nav2 en mode composant si use_composition:=True
        Node(
            condition=IfCondition(use_composition),
            name='nav2_container',
            package='rclcpp_components',
            executable='component_container_isolated',
            parameters=[configured_params, {'autostart': autostart}],
            arguments=['--ros-args', '--log-level', log_level],
            remappings=remappings,
            output='screen'
        ),

        # SLAM si slam:=True
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(os.path.join(launch_dir, 'slam_launch.py')),
            condition=IfCondition(slam),
            launch_arguments={
                'namespace': namespace,
                'use_sim_time': use_sim_time,
                'autostart': autostart,
                'use_respawn': use_respawn,
                'params_file': params_file
            }.items()
        ),

        # # Localization si slam:=False (nécessite 'map')
        # IncludeLaunchDescription(
        #     PythonLaunchDescriptionSource(os.path.join(launch_dir, 'localization_launch.py')),
        #     condition=IfCondition(PythonExpression(['not ', slam])),
        #     launch_arguments={
        #         'namespace': namespace,
        #         'map': map_yaml_file,
        #         'use_sim_time': use_sim_time,
        #         'autostart': autostart,
        #         'params_file': params_file,
        #         'use_composition': use_composition,
        #         'use_respawn': use_respawn,
        #         'container_name': 'nav2_container'
        #     }.items()
        # ),

        # Navigation
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(os.path.join(launch_dir, 'limo_navigation.launch.py')), #navigation_launch
            launch_arguments={
                'namespace': namespace,
                'use_sim_time': use_sim_time,
                'autostart': autostart,
                'params_file': params_file,
                'use_composition': use_composition,
                'use_respawn': use_respawn,
                'container_name': 'nav2_container'
            }.items()
        ),

        # Lancement de RViz2
        Node(
            package='rviz2',
            executable='rviz2',
            name='rviz2',
            arguments=['-d', rviz_config_dir],
            parameters=[{'use_sim_time': use_sim_time}],
            output='screen'
        ),
    ])

    # Construction de la LaunchDescription
    ld = LaunchDescription()

    # Variables d’environnement
    ld.add_action(stdout_linebuf_envvar)

    # On déclare les arguments
    ld.add_action(declare_namespace_cmd)
    ld.add_action(declare_use_namespace_cmd)
    ld.add_action(declare_slam_cmd)
    ld.add_action(declare_map_yaml_cmd)
    ld.add_action(declare_use_sim_time_cmd)
    ld.add_action(declare_params_file_cmd)
    ld.add_action(declare_autostart_cmd)
    ld.add_action(declare_use_composition_cmd)
    ld.add_action(declare_use_respawn_cmd)
    ld.add_action(declare_log_level_cmd)

    # On ajoute le group action qui lance le tout
    ld.add_action(bringup_cmd_group)

    return ld
