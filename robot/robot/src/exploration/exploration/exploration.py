import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from nav_msgs.msg import OccupancyGrid
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import NavigateToPose
from rclpy.action import ActionClient

# algorithmes 
# Frontier-Based	Fast, dynamic, multi-robot ready	Needs frequent map updates
# Wavefront	Guarantees coverage, adapts to obstacles	Computationally intensive
# ACO	Scalable, minimal communication	Risk of gaps with poor parameter tuning
# Hybrid (Frontier + PF)	Safe, smooth paths	Local minima risk
# Boustrophedon (Online)	Minimal overlap, structured paths	Complex real-time decomposition


class ExplorationLidarSubscriber(Node):
    def __init__(self):
        super().__init__('exploration_controller')
        self.declare_parameter('robot_id', 'robot1_102')
        self.robot_id = self.get_parameter('robot_id').value

        # Subscriptions
        exploration_topic = f'/{self.robot_id}/exploration'
        self.subscription = self.create_subscription(String, exploration_topic, self.exploration_callback, 10)

        lydar_topic = f'/{self.robot_id}/lydar'
        self.subscription = self.create_subscription(String, lydar_topic, self.lydar_callback, 10)

        self.nav2_client = ActionClient(self, NavigateToPose, 'navigate_to_pose')

        # Map representation (occupancy grid)
        self.map = OccupancyGrid()
        self.map_resolution = 0.1  # meters per cell
        self.map_origin = (0.0, 0.0)  # Adjust based on your arena

        self.get_logger().info("Exploration node initialized")

    def exploration_callback(self, msg):
        self.get_logger().info("Starting frontier-based exploration")
        self.find_and_send_frontier_goal() # Trigger first exploration goal

    def lydar_callback(self, msg):
        self.get_logger().info("Updating map with new LiDAR data")
        # 1. Convert LiDAR data to occupancy grid (You'll need to implement this conversion)
        # 2. Update self.map with new obstacle data
        # 3. Detect new frontiers periodically
        self.find_and_send_frontier_goal()

    def find_and_send_frontier_goal(self):
        # Detect frontiers (edges between explored/unexplored areas)
        frontiers = self.detect_frontiers()
        
        if frontiers:
            # Select most promising frontier (simple example: closest)
            goal_frontier = self.select_frontier(frontiers)
            
            # Convert frontier to map coordinates
            goal_pose = self.frontier_to_pose(goal_frontier)
            
            # Send goal to Nav2
            self.send_nav2_goal(goal_pose)

    def detect_frontiers(self):
        """Identify frontier cells in occupancy grid"""
        frontiers = []
        # Implementation steps:
        # 1. Iterate through occupancy grid cells
        # 2. Mark cells as frontier if:
        #    - Cell is free
        #    - Has at least one unexplored neighbor
        # 3. Cluster adjacent frontier cells into regions
        return frontiers

    def send_nav2_goal(self, pose):
        """Send navigation goal to Nav2"""
        goal_msg = NavigateToPose.Goal()
        goal_msg.pose = pose
        
        # Wait for Nav2 server
        if not self.nav2_client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error("Nav2 action server not available!")
            return

        # Send goal
        self.get_logger().info(f"Sending goal to {pose.pose.position}")
        self.nav2_client.send_goal_async(goal_msg)

    # Helper functions --------------------------------------------------
    def frontier_to_pose(self, frontier_cell):
        """Convert grid cell to map coordinates (for Nav2)"""
        pose = PoseStamped()
        pose.header.frame_id = 'map'  # Must match Nav2's frame
        
        # Calculate real-world coordinates
        x = self.map_origin[0] + (frontier_cell[0] * self.map_resolution)
        y = self.map_origin[1] + (frontier_cell[1] * self.map_resolution)
        
        pose.pose.position.x = x
        pose.pose.position.y = y
        return pose

    def select_frontier(self, frontiers):
        return frontiers[0] # returns the first frontier (the best)

def main(args=None):
    rclpy.init(args=args)
    node = ExplorationLidarSubscriber()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()