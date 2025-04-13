import rclpy
import os
from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.timer import Timer
from nav2_msgs.action import NavigateToPose
from nav_msgs.msg import OccupancyGrid , Odometry
from geometry_msgs.msg import Twist
from sensor_msgs.msg import LaserScan
from rclpy.qos import QoSProfile, QoSReliabilityPolicy, QoSHistoryPolicy, QoSDurabilityPolicy
from std_msgs.msg import Bool, String, Float32
import numpy as np
import heapq , math , random , yaml
import scipy.interpolate as si
import sys , threading , time
import math

from pathlib import Path
cwd = Path.cwd()
print(cwd)

with open("autonomous_exploration/config/params.yaml", 'r') as file:
    params = yaml.load(file, Loader=yaml.FullLoader)

lookahead_distance = params["lookahead_distance"]
speed = params["speed"]
expansion_size = params["expansion_size"]
target_error = params["target_error"]
robot_r = params["robot_r"]

pathGlobal = []

def euler_from_quaternion(x,y,z,w):
    t0 = +2.0 * (w * x + y * z)
    t1 = +1.0 - 2.0 * (x * x + y * y)
    roll_x = math.atan2(t0, t1)
    t2 = +2.0 * (w * y - z * x)
    t2 = +1.0 if t2 > +1.0 else t2
    t2 = -1.0 if t2 < -1.0 else t2
    pitch_y = math.asin(t2)
    t3 = +2.0 * (w * z + x * y)
    t4 = +1.0 - 2.0 * (y * y + z * z)
    yaw_z = math.atan2(t3, t4)
    return yaw_z

def heuristic(a, b):
    return np.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)

def astar(array, start, goal):
    neighbors = [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]
    close_set = set()
    came_from = {}
    gscore = {start:0}
    fscore = {start:heuristic(start, goal)}
    oheap = []
    heapq.heappush(oheap, (fscore[start], start))
    while oheap:
        current = heapq.heappop(oheap)[1]
        if current == goal:
            data = []
            while current in came_from:
                data.append(current)
                current = came_from[current]
            data = data + [start]
            data = data[::-1]
            return data
        close_set.add(current)
        for i, j in neighbors:
            neighbor = current[0] + i, current[1] + j
            tentative_g_score = gscore[current] + heuristic(current, neighbor)
            if 0 <= neighbor[0] < array.shape[0]:
                if 0 <= neighbor[1] < array.shape[1]:                
                    if array[neighbor[0]][neighbor[1]] == 1:
                        continue
                else:
                    # array bound y walls
                    continue
            else:
                # array bound x walls
                continue
            if neighbor in close_set and tentative_g_score >= gscore.get(neighbor, 0):
                continue
            if  tentative_g_score < gscore.get(neighbor, 0) or neighbor not in [i[1]for i in oheap]:
                came_from[neighbor] = current
                gscore[neighbor] = tentative_g_score
                fscore[neighbor] = tentative_g_score + heuristic(neighbor, goal)
                heapq.heappush(oheap, (fscore[neighbor], neighbor))
    # If no path to goal was found, return closest path to goal
    if goal not in came_from:
        closest_node = None
        closest_dist = float('inf')
        for node in close_set:
            dist = heuristic(node, goal)
            if dist < closest_dist:
                closest_node = node
                closest_dist = dist
        if closest_node is not None:
            data = []
            while closest_node in came_from:
                data.append(closest_node)
                closest_node = came_from[closest_node]
            data = data + [start]
            data = data[::-1]
            return data
    return False

def bspline_planning(array, sn):
    try:
        array = np.array(array)
        x = array[:, 0]
        y = array[:, 1]
        N = 2
        t = range(len(x))
        x_tup = si.splrep(t, x, k=N)
        y_tup = si.splrep(t, y, k=N)

        x_list = list(x_tup)
        xl = x.tolist()
        x_list[1] = xl + [0.0, 0.0, 0.0, 0.0]

        y_list = list(y_tup)
        yl = y.tolist()
        y_list[1] = yl + [0.0, 0.0, 0.0, 0.0]

        ipl_t = np.linspace(0.0, len(x) - 1, sn)
        rx = si.splev(ipl_t, x_list)
        ry = si.splev(ipl_t, y_list)
        path = [(rx[i],ry[i]) for i in range(len(rx))]
    except:
        path = array
    return path

def pure_pursuit(current_x, current_y, current_heading, path, index):
    global lookahead_distance
    closest_point = None
    v = speed
    for i in range(index,len(path)):
        x = path[i][0]
        y = path[i][1]
        distance = math.hypot(current_x - x, current_y - y)
        if lookahead_distance < distance:
            closest_point = (x, y)
            index = i
            break
    if closest_point is not None:
        target_heading = math.atan2(closest_point[1] - current_y, closest_point[0] - current_x)
        desired_steering_angle = target_heading - current_heading
    else:
        target_heading = math.atan2(path[-1][1] - current_y, path[-1][0] - current_x)
        desired_steering_angle = target_heading - current_heading
        index = len(path)-1
    if desired_steering_angle > math.pi:
        desired_steering_angle -= 2 * math.pi
    elif desired_steering_angle < -math.pi:
        desired_steering_angle += 2 * math.pi
    if desired_steering_angle > math.pi/6 or desired_steering_angle < -math.pi/6:
        sign = 1 if desired_steering_angle > 0 else -1
        desired_steering_angle = sign * math.pi/4
        v = 0.0
    return v,desired_steering_angle,index

def frontierB(matrix):
    for i in range(len(matrix)):
        for j in range(len(matrix[i])):
            if matrix[i][j] == 0.0:
                if i > 0 and matrix[i-1][j] < 0:
                    matrix[i][j] = 2
                elif i < len(matrix)-1 and matrix[i+1][j] < 0:
                    matrix[i][j] = 2
                elif j > 0 and matrix[i][j-1] < 0:
                    matrix[i][j] = 2
                elif j < len(matrix[i])-1 and matrix[i][j+1] < 0:
                    matrix[i][j] = 2
    return matrix

def assign_groups(matrix):
    group = 1
    groups = {}
    for i in range(len(matrix)):
        for j in range(len(matrix[0])):
            if matrix[i][j] == 2:
                group = dfs(matrix, i, j, group, groups)
    return matrix, groups

def dfs(matrix, i, j, group, groups):
    if i < 0 or i >= len(matrix) or j < 0 or j >= len(matrix[0]):
        return group
    if matrix[i][j] != 2:
        return group
    if group in groups:
        groups[group].append((i, j))
    else:
        groups[group] = [(i, j)]
    matrix[i][j] = 0
    dfs(matrix, i + 1, j, group, groups)
    dfs(matrix, i - 1, j, group, groups)
    dfs(matrix, i, j + 1, group, groups)
    dfs(matrix, i, j - 1, group, groups)
    dfs(matrix, i + 1, j + 1, group, groups)
    dfs(matrix, i - 1, j - 1, group, groups)
    dfs(matrix, i - 1, j + 1, group, groups)
    dfs(matrix, i + 1, j - 1, group, groups)
    return group + 1

def fGroups(groups):
    sorted_groups = sorted(groups.items(), key=lambda x: len(x[1]), reverse=True)
    top_five_groups = [g for g in sorted_groups[:5] if len(g[1]) > 2]    
    return top_five_groups

def calculate_centroid(x_coords, y_coords):
    n = len(x_coords)
    sum_x = sum(x_coords)
    sum_y = sum(y_coords)
    mean_x = sum_x / n
    mean_y = sum_y / n
    centroid = (int(mean_x), int(mean_y))
    return centroid

def findClosestGroup(matrix,groups, current,resolution,originX,originY):
    targetP = None
    distances = []
    paths = []
    score = []
    max_score = -1 #max score index
    for i in range(len(groups)):
        middle = calculate_centroid([p[0] for p in groups[i][1]],[p[1] for p in groups[i][1]]) 
        path = astar(matrix, current, middle)
        path = [(p[1]*resolution+originX,p[0]*resolution+originY) for p in path]
        total_distance = pathLength(path)
        distances.append(total_distance)
        paths.append(path)
    for i in range(len(distances)):
        if distances[i] == 0:
            score.append(0)
        else:
            score.append(len(groups[i][1])/distances[i])
    for i in range(len(distances)):
        if distances[i] > target_error*3:
            if max_score == -1 or score[i] > score[max_score]:
                max_score = i
    if max_score != -1:
        targetP = paths[max_score]
    else:
        index = random.randint(0,len(groups)-1)
        target = groups[index][1]
        target = target[random.randint(0,len(target)-1)]
        path = astar(matrix, current, target)
        targetP = [(p[1]*resolution+originX,p[0]*resolution+originY) for p in path]
    return targetP

def pathLength(path):
    for i in range(len(path)):
        path[i] = (path[i][0],path[i][1])
        points = np.array(path)
    differences = np.diff(points, axis=0)
    distances = np.hypot(differences[:,0], differences[:,1])
    total_distance = np.sum(distances)
    return total_distance

def costmap(data,width,height,resolution):
    data = np.array(data).reshape(height,width)
    wall = np.where(data == 100)
    for i in range(-expansion_size,expansion_size+1):
        for j in range(-expansion_size,expansion_size+1):
            if i  == 0 and j == 0:
                continue
            x = wall[0]+i
            y = wall[1]+j
            x = np.clip(x,0,height-1)
            y = np.clip(y,0,width-1)
            data[x,y] = 100
    data = data*resolution
    return data

def exploration(data,width,height,resolution,column,row,originX,originY):
        global pathGlobal
        data = costmap(data,width,height,resolution)
        data[row][column] = 0
        data[data > 5] = 1
        data = frontierB(data)
        data,groups = assign_groups(data)
        groups = fGroups(groups)
        if len(groups) == 0:
            path = -1
        else:
            data[data < 0] = 1
            path = findClosestGroup(data,groups,(row,column),resolution,originX,originY)
            if path != None:
                path = bspline_planning(path,len(path)*5)
            else:
                path = -1
        pathGlobal = path
        return

def localControl(scan):
    v = None
    w = None
    for i in range(60):
        if scan[i] < robot_r:
            v = 0.2
            w = -math.pi/4 
            break
    if v == None:
        for i in range(300,360):
            if scan[i] < robot_r:
                v = 0.2
                w = math.pi/4
                break
    return v,w


class navigationControl(Node):
    def __init__(self):
        super().__init__('exploration')

        self.domain_id = os.environ.get('ROS_DOMAIN_ID', '33')
        self.get_logger().info("robot id : " + self.domain_id)

        self.subscription = self.create_subscription(
            String,
            '/mission_control',
            self.listener_callback,
            10)
        self.subscription_returnToBase = self.create_subscription(
            String, f'/lm13{self.domain_id}/returnToBase', self.returnToBase_callback, 10)
        
        self.subscription_map = self.create_subscription(
            OccupancyGrid, '/map', self.map_callback, 10)
        self.subscription_odom = self.create_subscription(
            Odometry, '/odom', self.odom_callback, 10)
        qos_profile = QoSProfile(
            reliability=QoSReliabilityPolicy.BEST_EFFORT,
            history=QoSHistoryPolicy.KEEP_LAST,
            depth=10,
            durability=QoSDurabilityPolicy.VOLATILE
        )

        self.subscription_scan = self.create_subscription(
            LaserScan, '/scan', self.scan_callback, qos_profile)
        self.publisher = self.create_publisher(Twist, '/cmd_vel', 10)
        self.distance_publisher = self.create_publisher(Float32, f'/lm13{self.domain_id}/distance', 10)

        # Initialisation du client d'action
        self.move_base_client = ActionClient(self, NavigateToPose, 'navigate_to_pose')
        self.move_base_client.wait_for_server()
        self.current_goal_handle = None

        # Timer pour vérifier l'état de la navigation
        self.navigation_timer = self.create_timer(1.0, self.check_navigation_status)  # Vérifiez toutes les secondes
        
        # Variables pour l'état d'exploration
        self.kesif = True
        self.exploration_active = False
        self.stop_requested = False
        self.initial_position = None  # Position initiale
        self.current_goal = None  # Garder la trace de l'objectif actuel
        self.robot_total_distance = 0.0  # Distance totale parcourue par le robot1
        self.returning_to_base = False
        self.base_position = None  # Position de la base
        
        self.previous_position = None  # Pour suivre la position précédente du robot
        self.stuck_timer = 0  # Compteur pour déterminer si le robot est coincé
        self.recovery_attempts = 0  # Compteur de tentatives de récupération
        self.get_logger().info("Node 'exploration ROBOT' launched and waiting for the mission to start...")
               
    def returnToBase_callback(self, msg):
        self.get_logger().info('Returning to the initial position...')
        proximity_threshold = 0.20
        timeout_seconds = 60
        previous_distance = self.calculate_distance((self.x, self.y), self.initial_position)
        start_time = time.time()
        self.base_position = self.initial_position
        self.returning_to_base = True
        while self.returning_to_base:
            elapsed_time = time.time() - start_time
            distance_to_initial = self.calculate_distance((self.x, self.y), self.base_position)
            if distance_to_initial > proximity_threshold:
                print(f"[INFO] Returning to initial position. Distance remaining: {distance_to_initial:.2f}")
                self.send_navigation_goal(self.base_position)
            else:
                print("[INFO] Robot is close enough to the initial position.")
                msg = String()
                msg.data = 'stop'
                self.listener_callback(msg)
                self.returning_to_base = False
                break

            if elapsed_time > timeout_seconds:
                if previous_distance == distance_to_initial:
                    print("[INFO] Timeout reached while returning to the initial position.")
                    self.return_to_base_helper()
                else:
                    previous_distance = distance_to_initial
                    start_time = time.time()
            time.sleep(0.1)

    def return_to_base_helper(self):
        x_adjustment = self.base_position[0] + (self.x - self.initial_position[0]) * 0.1
        y_adjustment = self.base_position[1] + (self.y - self.initial_position[1]) * 0.1
        self.base_position = (x_adjustment, y_adjustment)
    
    def listener_callback(self, msg):
        if msg.data == 'start':
            self.get_logger().info('Starting the mission...')
            self.move_forward(0.1, 0.1)
            if not self.exploration_active:
                self.exploration_active = True
                self.exploration_thread = threading.Thread(target=self.exp)
                self.exploration_thread.start()
                self.get_logger().info('Autonomous exploration started.')
        else:
            self.get_logger().info('Stopping the mission...')
            self.stop_requested = True
            self.exploration_active = False
            self.cancel_navigation_goal()
            self.stop_robot()
            msg = Float32()
            msg.data = self.robot_total_distance
            self.distance_publisher.publish(msg)
            self.get_logger().info(f'Distance totale parcourue par le robot lm13{self.domain_id} : {msg.data} m')

            if self.exploration_thread is not None:
                self.exploration_thread.join()
            self.get_logger().info('Autonomous exploration stopped.')

    def stop_all_navigation(self):
        """Arrête tous les processus de navigation en annulant les objectifs."""
        self.get_logger().info("[INFO] Collision détectée, arrêt de la navigation.")
        self.stop_robot()
        self.exploration_active = False  # Suspend l'exploration
    
    def resume_navigation(self):
        """Reprend la navigation après qu'une collision a été évitée."""
        self.get_logger().info("[INFO] Collision évitée, reprise de la navigation.")
        self.exploration_active = True
        if self.current_goal:
            self.send_navigation_goal(self.current_goal)

    def move_forward(self, distance, speed=0.1):
        """Fait avancer le robot d'une petite distance à une vitesse donnée."""
        twist = Twist()
        twist.linear.x = speed  # Vitesse en m/s

        # Le temps pendant lequel le robot doit avancer (distance = vitesse * temps)
        duration = distance / speed

        start_time = time.time()
        while time.time() - start_time < duration:
            self.publisher.publish(twist)
            time.sleep(0.8)

        # Stopper le robot après l'avoir fait avancer
        twist.linear.x = 0.0
        self.publisher.publish(twist)
        print("[INFO] Movement completed")
    
    def turn_in_place(self, angle, angular_speed=0.5):
        """Fait tourner le robot sur lui-même d'un angle donné à une vitesse angulaire spécifiée."""
        twist = Twist()
        twist.angular.z = angular_speed  # Vitesse angulaire en rad/s

        # Calcul du temps pendant lequel le robot doit tourner (angle = vitesse * temps)
        duration = abs(angle) / angular_speed  # Le temps nécessaire pour effectuer la rotation

        start_time = time.time()
        # Garder le signe de l'angle pour tourner dans la bonne direction (positive ou négative)
        twist.angular.z = angular_speed if angle > 0 else -angular_speed

        # Publier la commande de rotation pendant la durée nécessaire
        while time.time() - start_time < duration:
            self.publisher.publish(twist)
            time.sleep(0.1)

        # Stopper la rotation du robot après avoir tourné
        twist.angular.z = 0.0
        self.publisher.publish(twist)
        print("[INFO] Rotation completed")


    def exp(self):
        while True:
            if self.exploration_active and not self.stop_requested:
                if not hasattr(self, 'map_data') or not hasattr(self, 'odom_data') or not hasattr(self, 'scan_data'):
                    time.sleep(0.1)
                    continue
            
                # Enregistrer la position initiale si ce n'est pas encore fait
                if self.initial_position is None:
                    self.initial_position = (self.x, self.y)
            
                if self.kesif:
                    # Vérifiez si toutes les zones ont été explorées
                    if self.is_exploration_complete():
                        print("[INFO] Exploration complete. Returning to initial position.")
                        self.kesif = False
                        self.send_navigation_goal(self.initial_position)  # Retour à la position initiale
                    else:
                        # Processus d'exploration comme précédemment
                        column = int((self.x - self.originX) / self.resolution)
                        row = int((self.y - self.originY) / self.resolution)
                        
                        try:
                            # Appel de la fonction d'exploration
                            exploration(self.data, self.width, self.height, self.resolution, column, row, self.originX, self.originY)
                        except RecursionError:
                            # Gestion de l'erreur de récursion
                            print("[ERROR] Maximum recursion depth exceeded during DFS exploration. Restarting exploration.")
                            print("[INFO] Restarting exploration in a new thread.")
                            threading.Thread(target=self.exp).start()
                            # Arrêter le thread actuel en sortant de la boucle principale
                            break
                    
                        if isinstance(pathGlobal, list) and len(pathGlobal) > 0:
                            target_position = pathGlobal[-1]
                            self.kesif = False  # Arrête l'exploration pour envoyer un objectif
                            print("[INFO] New exploration goal determined.")
                            self.send_navigation_goal(target_position)
                        else:
                            if self.initial_position:
                                distance_to_initial = self.calculate_distance((self.x, self.y), self.initial_position)
                                
                                # Seuil de proximité 
                                proximity_threshold = 0.25

                                if distance_to_initial > proximity_threshold:
                                    print(f"[INFO] Returning to initial position. Distance remaining: {distance_to_initial:.2f}")
                                    self.send_navigation_goal(self.initial_position)
                                else:
                                    print("[INFO] Robot is close enough to the initial position. Fin de mission")
                                    self.kesif = False 
                                    break
                                

                time.sleep(0.1)  # Éviter une utilisation excessive du CPU
        
    def is_exploration_complete(self):
        """Vérifie si la carte a été entièrement explorée."""
        for cell in self.data:
            if cell == -1:  # Zone non explorée 
                return False
        return True
    
    def calculate_distance(self, position1, position2):
        """Calcule la distance euclidienne entre deux positions (x, y)."""
        return ((position1[0] - position2[0]) ** 2 + (position1[1] - position2[1]) ** 2) ** 0.5

            
    def recover_from_stuck(self):
        """Tentative de récupération si le robot est coincé."""
        if self.recovery_attempts < 5:
            # Tenter un mouvement de récupération
            print(f"[INFO] Attempting recovery #{self.recovery_attempts + 1}...")
            recovery_move = Twist()
            recovery_move.linear.x = -0.1  # Reculer
            self.publisher.publish(recovery_move)
            time.sleep(1)  # Attendre un instant
            recovery_move.linear.x = 0.0  # Arrêter
            self.publisher.publish(recovery_move)

            # Essayez de tourner légèrement pour sortir de la zone coincée
            recovery_move.angular.z = 0.5  # Tourner à droite
            self.publisher.publish(recovery_move)
            time.sleep(1)  # Tourner un instant
            recovery_move.angular.z = 0.0  # Arrêter
            self.publisher.publish(recovery_move)

            self.recovery_attempts += 1
            self.kesif = True  # Réactive l'exploration
        else:
            # Après 5 tentatives, retour à la position initiale
            print("[INFO] Max recovery attempts reached. Returning to initial position.")
            self.recovery_attempts = 0  # Réinitialise le compteur de tentatives
            self.send_navigation_goal(self.initial_position)  # Retour à la position initiale

    def send_navigation_goal(self, target_position):
        """Crée et envoie le but de navigation."""
        if not self.move_base_client.server_is_ready():
            self.get_logger().warning("Action server not ready. Goal not sent.")
            return

        goal_msg = NavigateToPose.Goal()
        goal_msg.pose.pose.position.x = target_position[0]
        goal_msg.pose.pose.position.y = target_position[1]
        goal_msg.pose.pose.orientation.w = 1.0  # Orientation par défaut
        goal_msg.pose.header.frame_id = "map"
        goal_msg.pose.header.stamp = self.get_clock().now().to_msg()

        # Enregistre l'objectif actuel
        self.current_goal = target_position

        # Envoie l'objectif avec vérification de l'état du futur
        future = self.move_base_client.send_goal_async(goal_msg)
        if future is not None:
            future.add_done_callback(self.goal_response_callback)
        else:
            self.get_logger().warning("Failed to send goal.")

    def goal_response_callback(self, future):
        result = future.result()
        if result is not None:
            print("Goal accepted by navigation server.")
        else:
            print("Goal rejected.")

    def cancel_navigation_goal(self):
        """Annule l'objectif actuel envoyé à Nav2."""
        if self.current_goal_handle is not None:
            self.get_logger().info("Annulation de l'objectif de navigation...")
            cancel_future = self.current_goal_handle.cancel_goal_async()
            cancel_future.add_done_callback(self.cancel_done_callback)
        else:
            self.get_logger().warning("Aucun objectif actif à annuler.")

    def cancel_done_callback(self, future):
        cancel_result = future.result()
        if cancel_result.accepted:
            self.get_logger().info("L'objectif a été annulé avec succès.")
        else:
            self.get_logger().warning("Échec de l'annulation de l'objectif.")

    def check_navigation_status(self):
        """Vérifie l'état actuel de la navigation."""
        if self.current_goal is not None and self.odom_data is not None and self.returning_to_base is False:
            current_position = (self.x, self.y)
            distance_to_goal = ((self.current_goal[0] - current_position[0]) ** 2 + (self.current_goal[1] - current_position[1]) ** 2) ** 0.5
        
            if distance_to_goal < 0.1:  # À moins de 10 cm de l'objectif
                print("[INFO] Goal reached.")
                if self.current_goal == self.initial_position:
                    print("[INFO] Returned to initial position. Stopping the robot.")
                    self.stop_robot()  # Arrêter le robot une fois de retour à la position initiale
                else:
                    self.kesif = True  # Réactive l'exploration si on n'est pas encore à la position initiale
                self.current_goal = None  # Réinitialiser l'objectif actuel
            else:
                # Vérifier si le robot est arrêté
                if self.odom_data.twist.twist.linear.x < 0.01 and self.odom_data.twist.twist.linear.y < 0.01:
                    print("[INFO] Robot stopped.")
                    self.kesif = True  # Réactive l'exploration
                    self.current_goal = None
                    
    def stop_robot(self):
        """Arrêter le robot."""
        stop_msg = Twist()
        stop_msg.linear.x = 0.0
        stop_msg.angular.z = 0.0
        self.publisher.publish(stop_msg)
        print("[INFO] Robot has stopped.")
             
    def scan_callback(self, msg):
        self.scan_data = msg
        self.scan = msg.ranges

    def map_callback(self, msg):
        self.map_data = msg
        self.resolution = self.map_data.info.resolution
        self.originX = self.map_data.info.origin.position.x
        self.originY = self.map_data.info.origin.position.y
        self.width = self.map_data.info.width
        self.height = self.map_data.info.height
        self.data = self.map_data.data

    def odom_callback(self, msg):
        self.odom_data = msg
        self.x = msg.pose.pose.position.x
        self.y = msg.pose.pose.position.y
        self.yaw = euler_from_quaternion(msg.pose.pose.orientation.x,
                                          msg.pose.pose.orientation.y,
                                          msg.pose.pose.orientation.z,
                                          msg.pose.pose.orientation.w)
        current_position = msg.pose.pose.position
        if self.previous_position is not None:
            distance = math.sqrt(
                (current_position.x - self.previous_position.x) ** 2 +
                (current_position.y - self.previous_position.y) ** 2
            )
            self.robot_total_distance += distance
        self.previous_position = current_position

    def stop_callback(self, msg):
        """Callback pour gérer les signaux d'arrêt de collision."""
        self.stop_requested = msg.data
        if self.stop_requested:
            self.stop_all_navigation()
        else:
            self.resume_navigation()

def main(args=None):
    rclpy.init(args=args)
    navigation_control = navigationControl()
    rclpy.spin(navigation_control)
    navigation_control.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()