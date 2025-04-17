import rclpy
import random
import math

from rclpy.node import Node
from rclpy.action import ActionClient

from nav_msgs.msg import OccupancyGrid, Odometry  # Updated import
from geometry_msgs.msg import PoseStamped, PoseWithCovarianceStamped
from nav2_msgs.action import NavigateToPose
from std_msgs.msg import Empty
import subprocess
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
from ament_index_python.packages import get_package_share_directory

from pathlib import Path
cwd = Path.cwd()
print(cwd)

package_path = get_package_share_directory("autonomous_exploration")
params_path = os.path.join(package_path, "config", "params.yaml")
with open(params_path, 'r') as file:
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
        data[data >= 30] = 1
        data[(data >= 0) & (data < 30)] = 0
        data = frontierB(data)
        data,groups = assign_groups(data)
        groups = fGroups(groups)
        if len(groups) == 0:
            path = [] # -1
        else:
            data[data < 0] = 1
            path = findClosestGroup(data,groups,(row,column),resolution,originX,originY)
            if path != None:
                path = bspline_planning(path,len(path)*5)
            else:
                path = [] # -1
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

class MissionNode(Node):
    def __init__(self):
        super().__init__('mission_node')
        self.declare_parameter('robot_id', 'limo1')
        self.robot_id = self.get_parameter('robot_id').value

        qos_profile = QoSProfile(reliability=QoSReliabilityPolicy.BEST_EFFORT,
            history=QoSHistoryPolicy.KEEP_LAST, depth=10, durability=QoSDurabilityPolicy.VOLATILE)

        start_topic = f'/{self.robot_id}/start_mission'
        return_topic = f'/{self.robot_id}/return_to_base'
        end_topic = f'/{self.robot_id}/end_mission'
        self.map_frame = f'{self.robot_id}/map'
        odom_topic = f'/{self.robot_id}/odom'
        cmd_topic = f'/{self.robot_id}/cmd_vel'
        nav2_topic = f'/{self.robot_id}/navigate_to_pose'

        self.start_subscription = self.create_subscription(Empty, start_topic, self.start_callback, 10)
        self.stop_subscription = self.create_subscription(Empty, return_topic, self.end_callback, 10)
        self.end_subscription = self.create_subscription(Empty, end_topic, self.stop_callback, 10)
        self.map_subscription = self.create_subscription(OccupancyGrid, self.map_frame, self.map_callback, 10)
        self.pose_subscription = self.create_subscription(Odometry, odom_topic, self.pose_callback, qos_profile)

        self.cmd_publisher = self.create_publisher(Twist, cmd_topic, 10)
        self.nav_client = ActionClient(self, NavigateToPose, nav2_topic)

        self.mission_active = False
        self.isFirstOdom = True
        self.initial_pose = None
        self.current_pose = None
        self.map_data = None
        self.timer = None
        self.current_goal_handle = None
        self.is_stop_mode = False
        self.returning_to_base = False
        self.stuck_check_timer = None

        self.last_positions = []
        self.last_check_time = time.time()
        self.stuck_duration_threshold = 5.0 
        self.stuck_distance_threshold = 0.05

    def timer_callback(self):
        if self.mission_active:
            self.explore_map()

    def start_callback(self, msg):
        if not self.is_stop_mode:
            self.move(0.3, 0.3)
        self.mission_active = True
        self.is_stop_mode = False
        self.get_logger().info("Starting the mission mission")
        self.timer = self.create_timer(5.0, self.timer_callback)
        self.explore_map()

        self.prev_x = None
        self.prev_y = None
        #self.stuck_check_timer = self.create_timer(2.0, self.stuck_check_callback) # TODO 

    def stop_callback(self, msg):
        self.mission_active = False
        self.is_stop_mode = True
        self.get_logger().info("Stopping the mission")

        if self.current_goal_handle is not None:
            cancel_future = self.current_goal_handle.cancel_goal_async()
            cancel_future.add_done_callback(self.cancel_done_callback)

        # if self.stuck_check_timer is not None: # TODO
        #     self.stuck_check_timer.cancel()

    def end_callback(self, msg):

        self.play_sound("return")

        self.mission_active = False
        self.returning_to_base = True
        self.get_logger().info(f"Ending mission, returning to: x={self.initial_pose.pose.position.x:.2f}, y={self.initial_pose.pose.position.y :.2f}")

        goal_msg = NavigateToPose.Goal()
        goal_pose = PoseStamped()
        goal_pose.header.frame_id = self.map_frame
        goal_pose.header.stamp = self.get_clock().now().to_msg()
        goal_pose.pose.position.x = self.initial_pose.pose.position.x
        goal_pose.pose.position.y = self.initial_pose.pose.position.y
        goal_pose.pose.orientation.w = 1.0
        goal_msg.pose = goal_pose

        send_goal_future = self.nav_client.send_goal_async(goal_msg)
        send_goal_future.add_done_callback(self.goal_response_callback)

    def explore_map(self):

        if self.map_data is None:
            self.get_logger().error("No map received.")
            return
        if self.current_pose is None:
            self.get_logger().error("No position received")
            return

        column = int((self.x - self.originX) / self.resolution)
        row = int((self.y - self.originY) / self.resolution)

        resolution = self.map_data.info.resolution
        origin_x = self.map_data.info.origin.position.x
        origin_y = self.map_data.info.origin.position.y
        width = self.map_data.info.width
        height = self.map_data.info.height
        robot_x = self.current_pose.pose.position.x
        robot_y = self.current_pose.pose.position.y

        if self.robot_id == 'limo1':
            candidates = [
                (robot_x, robot_y + 1),
                (robot_x + 1, robot_y + 1),
                (robot_x + 1, robot_y),
                (robot_x + 1, robot_y - 1),
                (robot_x, robot_y - 1),
                (robot_x - 1, robot_y - 1),
                (robot_x - 1, robot_y),
                (robot_x - 1, robot_y + 1)
            ]
        else :
            candidates = [
                (robot_x, robot_y - 1),
                (robot_x + 1, robot_y - 1),
                (robot_x + 1, robot_y),
                (robot_x + 1, robot_y + 1),
                (robot_x, robot_y + 1),
                (robot_x - 1, robot_y + 1),
                (robot_x - 1, robot_y),
                (robot_x - 1, robot_y - 1),
            ]

        def is_free(x, y):
            mx = int((x - origin_x) / resolution)
            my = int((y - origin_y) / resolution)

            if 0 <= mx < width and 0 <= my < height:
                index = my * width + mx
                self.get_logger().info(f"searching index if available ={self.map_data.data[index]}")
                return self.map_data.data[index] <= 30 and self.map_data.data[index] != -1
            return False
        free_candidates = [c for c in candidates if is_free(*c)]
        if not free_candidates:
            self.get_logger().warn("No free candidate points found, remove obstacles!")
            return
        goal_x, goal_y = free_candidates[0]

        # exploration(self.data, self.width, self.height, self.resolution, column, row, self.originX, self.originY) # TODO
        # if len(pathGlobal) == 0:
        #     self.get_logger().warn("The mission is completed, the robot stops")
        #     self.mission_active = False
        #     return
        # goal_x, goal_y = pathGlobal[-1]

        self.get_logger().info(f"Selected goal: x={goal_x:.2f}, y={goal_y:.2f}")

        goal_msg = NavigateToPose.Goal()
        goal_pose = PoseStamped()
        goal_pose.header.frame_id = self.map_frame
        goal_pose.pose.position.x = goal_x
        goal_pose.pose.position.y = goal_y
        goal_pose.pose.orientation.w = 1.0
        goal_msg.pose = goal_pose

        if not self.nav_client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error("NavigateToPose server not available!")
            return

        send_goal_future = self.nav_client.send_goal_async(goal_msg, feedback_callback=self.feedback_callback)
        send_goal_future.add_done_callback(self.goal_response_callback)

    def goal_response_callback(self, future):
        self.current_goal_handle = future.result()
        if not self.current_goal_handle.accepted:
            self.get_logger().error("Goal rejected by server")
            self.current_goal_handle = None
            return
        self.get_logger().info("Goal accepted")
        result_future = self.current_goal_handle.get_result_async()
        result_future.add_done_callback(self.get_result_callback)

    def get_result_callback(self, future):
        result = future.result().result
        self.get_logger().info("Navigation action completed with result: " + str(result))

    def feedback_callback(self, feedback_msg):
        feedback = feedback_msg.feedback
        self.get_logger().debug("Received feedback: " + str(feedback))

    def cancel_done_callback(self, future):
        self.get_logger().info("Navigation goal successfully canceled.")
        twist = Twist()
        twist.linear.x = 0.0
        twist.linear.y = 0.0
        twist.linear.z = 0.0
        twist.angular.x = 0.0
        twist.angular.y = 0.0
        twist.angular.z = 0.0
        self.cmd_publisher.publish(twist)

    def map_callback(self, msg: OccupancyGrid):
        self.map_data = msg
        self.resolution = self.map_data.info.resolution
        self.originX = self.map_data.info.origin.position.x
        self.originY = self.map_data.info.origin.position.y
        self.width = self.map_data.info.width
        self.height = self.map_data.info.height
        self.data = self.map_data.data

    def pose_callback(self, msg: Odometry):
        pose_stamped = PoseStamped()
        pose_stamped.header = msg.header
        pose_stamped.pose = msg.pose.pose

        self.x = msg.pose.pose.position.x
        self.y = msg.pose.pose.position.y
        self.yaw = euler_from_quaternion(msg.pose.pose.orientation.x, msg.pose.pose.orientation.y,
                                          msg.pose.pose.orientation.z,msg.pose.pose.orientation.w)

        if self.isFirstOdom == True:
            self.isFirstOdom = False
            self.initial_pose = pose_stamped
        self.current_pose = pose_stamped

    def move(self, distance, speed):
        twist = Twist()
        twist.linear.x = speed
        duration = distance / speed
        start_time = time.time()
        while time.time() - start_time < duration:
            self.cmd_publisher.publish(twist)
            time.sleep(0.8)
        twist.linear.x = 0.0
        self.cmd_publisher.publish(twist)

    def rotate(self, angle, angular_speed):
        twist = Twist()
        direction = 1.0 if angle >= 0.0 else -1.0
        twist.angular.z = direction * angular_speed
        duration = abs(angle) / angular_speed
        start_time = time.time()
        while time.time() - start_time < duration:
            self.cmd_publisher.publish(twist)
            time.sleep(0.1)
        twist.angular.z = 0.0
        self.cmd_publisher.publish(twist)

    def is_stock(self):
        self.get_logger().info("The robot is stock")

    def play_sound(self, sound_id):
        sound_dir = '/home/equipe102/Desktop/INF3995-102/robot/common'
        sound_file = f'{sound_dir}/{sound_id}.wav'
        if os.path.exists(sound_file):
            subprocess.Popen(['aplay', sound_file])
        else:
            self.get_logger().error(f"Fichier son introuvable: {sound_file}")

    def stuck_check_callback(self):
        if self.x is None or self.y is None:
            return
        

        if self.returning_to_base:
            distance_to_initial = math.hypot(
                self.x - self.initial_pose.pose.position.x,
                self.y - self.initial_pose.pose.position.y
            )
            if distance_to_initial < 0.2:
                self.get_logger().info("Robot has reached base. Stopping stuck-check timer.")
                if self.stuck_check_timer is not None: # TODO
                    self.stuck_check_timer.cancel()
                    self.stuck_check_timer = None
                self.returning_to_base = False
                return

        if self.prev_x is not None and self.prev_y is not None:
            distance = math.hypot(self.x - self.prev_x, self.y - self.prev_y)
            if distance < self.stuck_distance_threshold:
                self.get_logger().warn("Robot hasn't moved for 1 second. Checking for stuck condition.")
                self.recovery_behavior()

        self.prev_x = self.x
        self.prev_y = self.y

    def recovery_behavior(self):
        twist = Twist()
        iterations = 1

        for i in range(iterations):
            twist.linear.x = 0.3
            twist.angular.z = -8.0
            duration = 1.0
            start_time = time.time()
            while time.time() - start_time < duration:
                self.cmd_publisher.publish(twist)
                time.sleep(0.05)

            twist.linear.x = -0.3
            twist.angular.z = -0.8
            start_time = time.time()
            while time.time() - start_time < duration:
                self.cmd_publisher.publish(twist)
                time.sleep(0.05)

        twist.linear.x = 0.0
        twist.angular.z = 0.0
        self.cmd_publisher.publish(twist)

def main(args=None):
    rclpy.init(args=args)
    node = MissionNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()