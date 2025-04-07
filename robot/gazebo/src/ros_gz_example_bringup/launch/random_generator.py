#!/usr/bin/env python3
import os
import random
import sys

def generate_random_walls(num_walls=3):
    walls_sdf = ""
    margin = 0.75
    min_coord = -2 + margin
    max_coord = 2 - margin

    for i in range(num_walls):
        x = round(random.uniform(min_coord, max_coord), 2)
        y = round(random.uniform(min_coord, max_coord), 2)
        orientation = round(random.uniform(0, 3.14159), 2)
        length = 0.7
        thickness = 0.1
        height = 0.8

        wall_sdf = f"""
    <model name="random_wall_{i}">
      <static>true</static>
      <link name="link">
        <pose>{x} {y} 0 0 0 {orientation}</pose>
        <collision name="collision">
          <geometry>
            <box>
              <size>{length} {thickness} {height}</size>
            </box>
          </geometry>
        </collision>
        <visual name="visual">
          <geometry>
            <box>
              <size>{length} {thickness} {height}</size>
            </box>
          </geometry>
        </visual>
      </link>
    </model>
        """
        walls_sdf += wall_sdf
    return walls_sdf

def main():
    robot_count = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    num_walls = 4

    sdf_header = """<?xml version="1.0" ?>
<sdf version="1.8">
  <world name="demo">
    <plugin filename="ignition-gazebo-physics-system" name="ignition::gazebo::systems::Physics"/>
    <plugin filename="ignition-gazebo-sensors-system" name="ignition::gazebo::systems::Sensors">
      <render_engine>ogre2</render_engine>
    </plugin>
    <plugin filename="ignition-gazebo-scene-broadcaster-system" name="ignition::gazebo::systems::SceneBroadcaster"/>
    <plugin filename="ignition-gazebo-user-commands-system" name="ignition::gazebo::systems::UserCommands"/>

    <light name="sun" type="directional">
      <cast_shadows>true</cast_shadows>
      <pose>0 0 10 0 0 0</pose>
      <diffuse>0.8 0.8 0.8 1</diffuse>
      <specular>0.2 0.2 0.2 1</specular>
      <attenuation>
        <range>1000</range>
        <constant>0.9</constant>
        <linear>0.01</linear>
        <quadratic>0.001</quadratic>
      </attenuation>
      <direction>-0.5 0.1 -0.9</direction>
    </light>

    <model name="ground_plane">
      <static>true</static>
      <link name="link">
        <collision name="collision">
          <geometry>
            <plane>
              <normal>0 0 1</normal>
              <size>100 100</size>
            </plane>
          </geometry>
        </collision>
        <visual name="visual">
          <geometry>
            <plane>
              <normal>0 0 1</normal>
              <size>100 100</size>
            </plane>
          </geometry>
          <material>
            <ambient>0.8 0.8 0.8 1</ambient>
            <diffuse>0.8 0.8 0.8 1</diffuse>
            <specular>0.8 0.8 0.8 1</specular>
          </material>
        </visual>
      </link>
    </model>

    <!-- Robot limo1 -->
    <model name="limo1">
      <self_collide>true</self_collide>
      <pose>-1.3 -1.3 0.35 0 0 1.5</pose>
      <include merge="true">
        <uri>package://ros_gz_example_description/models/limo_diff_drive1</uri>
      </include>
    </model>
"""

    # Add second robot only if requested
    if robot_count >= 2:
        sdf_header += """
    <!-- Robot limo2 -->
    <model name="limo2">
      <self_collide>true</self_collide>
      <pose>1.3 -1.3 0.35 0 0 1.5</pose>
      <include merge="true">
        <uri>package://ros_gz_example_description/models/limo_diff_drive2</uri>
      </include>
    </model>
"""

    # Fixed walls
    fixed_walls = """
    <!-- Fixed walls forming a square -->
    <model name="fixed_wall_north">
      <static>true</static>
      <link name="link">
        <pose>0 2 0 0 0 0</pose>
        <collision name="collision">
          <geometry><box><size>4 0.1 1</size></box></geometry>
        </collision>
        <visual name="visual">
          <geometry><box><size>4 0.1 1</size></box></geometry>
        </visual>
      </link>
    </model>

    <model name="fixed_wall_south">
      <static>true</static>
      <link name="link">
        <pose>0 -2 0 0 0 0</pose>
        <collision name="collision">
          <geometry><box><size>4 0.1 1</size></box></geometry>
        </collision>
        <visual name="visual">
          <geometry><box><size>4 0.1 1</size></box></geometry>
        </visual>
      </link>
    </model>

    <model name="fixed_wall_east">
      <static>true</static>
      <link name="link">
        <pose>2 0 0 0 0 1.5708</pose>
        <collision name="collision">
          <geometry><box><size>4 0.1 1</size></box></geometry>
        </collision>
        <visual name="visual">
          <geometry><box><size>4 0.1 1</size></box></geometry>
        </visual>
      </link>
    </model>

    <model name="fixed_wall_west">
      <static>true</static>
      <link name="link">
        <pose>-2 0 0 0 0 1.5708</pose>
        <collision name="collision">
          <geometry><box><size>4 0.1 1</size></box></geometry>
        </collision>
        <visual name="visual">
          <geometry><box><size>4 0.1 1</size></box></geometry>
        </visual>
      </link>
    </model>
"""

    sdf_footer = """
  </world>
</sdf>
"""

    final_sdf = sdf_header + fixed_walls + generate_random_walls(num_walls) + sdf_footer

    pkg_worlds_dir = os.path.dirname(__file__)
    output_sdf_path = os.path.join(pkg_worlds_dir, 'random_world.sdf')
    with open(output_sdf_path, 'w') as f:
        f.write(final_sdf)

if __name__ == "__main__":
    main()
