import rclpy
import random
from rclpy.node import Node
from rclpy.action import ActionClient
from nav_msgs.msg import OccupancyGrid
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import NavigateToPose
from action_msgs.msg import GoalStatus
from std_msgs.msg import Empty

class MissionNode(Node):
    def __init__(self):
        super().__init__('mission_node')
        self.declare_parameter('robot_id', 'limo1')
        self.robot_id = self.get_parameter('robot_id').value
        
        self.map_sub = self.create_subscription(OccupancyGrid,f'/map', self.map_callback, 10)
        self.costmap_sub = self.create_subscription(OccupancyGrid, '/global_costmap/costmap', self.costmap_callback, 10)
        self.start_sub = self.create_subscription(Empty, '/start_exploration', self.start_callback, 10)
        
        self.action_client = ActionClient(self, NavigateToPose, 'navigate_to_pose')

        self.timer = self.create_timer(10.0, self.timer_callback)
        self.current_goal_handle = None    
        self.exploration_active = False
        self.map = None
        self.costmap = None

    def start_callback(self, msg):
        self.get_logger().info("Received start command!")
        self.exploration_active = True

    def map_callback(self, msg):
        self.map = msg

    def costmap_callback(self, msg):
        self.costmap = msg

    def timer_callback(self):

        if not self.exploration_active:
            return 
        
        if self.map is None or self.costmap is None:
            self.get_logger().info("Waiting for map and costmap...")
            return
        
        if self.current_goal_handle is not None:
            # Check if the current goal is still active
            if self.current_goal_handle.status != GoalStatus.STATUS_SUCCEEDED:
                self.get_logger().info("Current goal still active.")
                return
            else:
                self.current_goal_handle = None
        
        frontiers = self.find_frontiers()
        if not frontiers:
            self.get_logger().info("No frontiers found.")
            self.exploration_active = False
            return
        
        goal_point = self.select_random_goal(frontiers)
        if goal_point:
            self.send_goal(goal_point)

    def find_frontiers(self):
        frontiers = []
        if self.map is None:
            return frontiers
        
        map_data = self.map.data
        map_width = self.map.info.width
        map_height = self.map.info.height
        resolution = self.map.info.resolution
        origin_x = self.map.info.origin.position.x
        origin_y = self.map.info.origin.position.y
        
        for y in range(1, map_height - 1):
            for x in range(1, map_width - 1):
                idx = y * map_width + x
                if map_data[idx] == 0:
                    neighbors = [
                        (x+1, y), (x-1, y),
                        (x, y+1), (x, y-1)
                    ]
                    for nx, ny in neighbors:
                        n_idx = ny * map_width + nx
                        if 0 <= nx < map_width and 0 <= ny < map_height:
                            if map_data[n_idx] == -1:
                                world_x = origin_x + (x + 0.5) * resolution
                                world_y = origin_y + (y + 0.5) * resolution
                                if self.is_navigable(world_x, world_y):
                                    frontiers.append((world_x, world_y))
                                    break
        return frontiers

    def is_navigable(self, x, y):
        if self.costmap is None:
            return False
        
        origin_x = self.costmap.info.origin.position.x
        origin_y = self.costmap.info.origin.position.y
        resolution = self.costmap.info.resolution
        costmap_width = self.costmap.info.width
        costmap_height = self.costmap.info.height
        
        gx = int((x - origin_x) / resolution)
        gy = int((y - origin_y) / resolution)
        
        if gx < 0 or gy < 0 or gx >= costmap_width or gy >= costmap_height:
            return False
        
        idx = gy * costmap_width + gx
        return self.costmap.data[idx] < 50

    def select_random_goal(self, frontiers):
        if not frontiers:
            return None
        return random.choice(frontiers)

    def send_goal(self, goal_point):
        goal_msg = NavigateToPose.Goal()
        goal_msg.pose.header.frame_id = 'map'
        goal_msg.pose.header.stamp = self.get_clock().now().to_msg()
        goal_msg.pose.pose.position.x = goal_point[0]
        goal_msg.pose.pose.position.y = goal_point[1]
        goal_msg.pose.pose.orientation.w = 1.0  # Facing forward
        
        self.action_client.wait_for_server()
        send_goal_future = self.action_client.send_goal_async(goal_msg)
        send_goal_future.add_done_callback(self.goal_response_callback)

    def goal_response_callback(self, future):
        goal_handle = future.result()
        if not goal_handle.accepted:
            self.get_logger().info('Goal rejected')
            return
        
        self.get_logger().info('Goal accepted')
        self.current_goal_handle = goal_handle
        result_future = goal_handle.get_result_async()
        result_future.add_done_callback(self.get_result_callback)

    def get_result_callback(self, future):
        result = future.result().result
        status = future.result().status
        if status == GoalStatus.STATUS_SUCCEEDED:
            self.get_logger().info('Goal succeeded!')
        else:
            self.get_logger().info(f'Goal failed with status: {status}')
        self.current_goal_handle = None

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