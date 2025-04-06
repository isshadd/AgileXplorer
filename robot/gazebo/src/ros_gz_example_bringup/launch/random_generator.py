#!/usr/bin/env python3
import os
import random
import sys

def generate_random_walls(num_walls=3):
    """
    Génère num_walls murs (3 ou 4) dans des positions et orientations aléatoires.
    Ces murs auront une longueur de 1.5 m et seront placés de façon à être entièrement 
    contenus dans le carré formé par les murs fixes.
    Retourne une chaîne de caractères SDF contenant ces murs.
    """
    walls_sdf = ""
    
    # Définir la marge pour ne pas dépasser la bordure
    margin = 0.75  # moitié de la longueur (1.5/2)
    min_coord = -2 + margin  # -2 + 0.75 = -1.25
    max_coord = 2 - margin   # 2 - 0.75 = 1.25

    for i in range(num_walls):
        # Choisir aléatoirement x et y dans l'intervalle pour être dans le carré intérieur
        x = round(random.uniform(min_coord, max_coord), 2)
        y = round(random.uniform(min_coord, max_coord), 2)

        # Orientation aléatoire (entre 0 et π)
        orientation = round(random.uniform(0, 3.14159), 2)

        # Dimensions du mur aléatoire
        length = 0.7
        thickness = 0.1
        height = 0.8

        # Bloc <model> SDF pour un mur aléatoire
        wall_sdf = f"""
    <model name="random_wall_{i}">
      <static>true</static>
      <link name="link">
        <!-- pose: x y z roll pitch yaw -->
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
    num_walls = 4  # ou 4

    # SDF fixe comprenant sol, robots et murs fixes formant un carré (4 m de côté)
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

    <model name="limo1">
      <self_collide>true</self_collide>
      <pose>-1.3 -1.3 0.35 0 0 1.5</pose>
      <include merge="true">
        <uri>package://ros_gz_example_description/models/limo_diff_drive1</uri>
      </include>
    </model>

    <model name="limo2">
      <self_collide>true</self_collide>
      <pose>1.3 -1.3 0.35 0 0 1.5</pose>
      <include merge="true">
        <uri>package://ros_gz_example_description/models/limo_diff_drive2</uri>
      </include>
    </model>
    <!-- Murs fixes formant un carré de 4 m de côté -->
    <!-- Mur fixe au nord -->
    <model name="fixed_wall_north">
      <static>true</static>
      <link name="link">
        <!-- Placé en (0, 2) -->
        <pose>0 2 0 0 0 0</pose>
        <collision name="collision">
          <geometry>
            <box>
              <size>4 0.1 1</size>
            </box>
          </geometry>
        </collision>
        <visual name="visual">
          <geometry>
            <box>
              <size>4 0.1 1</size>
            </box>
          </geometry>
        </visual>
      </link>
    </model>

    <!-- Mur fixe au sud -->
    <model name="fixed_wall_south">
      <static>true</static>
      <link name="link">
        <!-- Placé en (0, -2) -->
        <pose>0 -2 0 0 0 0</pose>
        <collision name="collision">
          <geometry>
            <box>
              <size>4 0.1 1</size>
            </box>
          </geometry>
        </collision>
        <visual name="visual">
          <geometry>
            <box>
              <size>4 0.1 1</size>
            </box>
          </geometry>
        </visual>
      </link>
    </model>

    <!-- Mur fixe à l'est -->
    <model name="fixed_wall_east">
      <static>true</static>
      <link name="link">
        <!-- Placé en (2, 0), rotation 90° -->
        <pose>2 0 0 0 0 1.5708</pose>
        <collision name="collision">
          <geometry>
            <box>
              <size>4 0.1 1</size>
            </box>
          </geometry>
        </collision>
        <visual name="visual">
          <geometry>
            <box>
              <size>4 0.1 1</size>
            </box>
          </geometry>
        </visual>
      </link>
    </model>

    <!-- Mur fixe à l'ouest -->
    <model name="fixed_wall_west">
      <static>true</static>
      <link name="link">
        <!-- Placé en (-2, 0), rotation 90° -->
        <pose>-2 0 0 0 0 1.5708</pose>
        <collision name="collision">
          <geometry>
            <box>
              <size>4 0.1 1</size>
            </box>
          </geometry>
        </collision>
        <visual name="visual">
          <geometry>
            <box>
              <size>4 0.1 1</size>
            </box>
          </geometry>
        </visual>
      </link>
    </model>

    """

    # Générer les murs aléatoires à l'intérieur du carré
    random_walls_sdf = generate_random_walls(num_walls)

    # Construction du fichier SDF final
    sdf_footer = """
  </world>
</sdf>
"""
    final_sdf = sdf_header + random_walls_sdf + sdf_footer

    # Écriture du fichier SDF généré dans "random_world.sdf"
    pkg_worlds_dir = os.path.join(os.path.dirname(__file__))
    output_sdf_path = os.path.join(pkg_worlds_dir, 'random_world.sdf')
    with open(output_sdf_path, 'w') as f:
        f.write(final_sdf)

if __name__ == "__main__":
    main()
