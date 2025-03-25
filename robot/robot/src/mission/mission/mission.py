import rclpy
import random
import math

from rclpy.node import Node
from rclpy.action import ActionClient

from nav_msgs.msg import OccupancyGrid
from geometry_msgs.msg import PoseStamped, PoseWithCovarianceStamped
from nav2_msgs.action import NavigateToPose
from std_msgs.msg import Empty

class MissionNode(Node):
    def __init__(self):
        super().__init__('mission_node')
        self.declare_parameter('robot_id', 'limo1')
        self.robot_id = self.get_parameter('robot_id').value

        start_topic = f'/{self.robot_id}/start_mission'
        end_topic = f'/{self.robot_id}/end_mission'
        self.start_subscription = self.create_subscription(Empty, start_topic, self.start_callback, 10)
        self.end_subscription = self.create_subscription(Empty,end_topic, self.end_callback, 10)

        self.map_subscription = self.create_subscription(OccupancyGrid,'map', self.map_callback, 10)
        self.map_data = None

        self.pose_subscription = self.create_subscription(PoseWithCovarianceStamped,'amcl_pose', self.pose_callback, 10)
        self.current_pose = None

        self.nav_client = ActionClient(self, NavigateToPose, 'navigate_to_pose')
        self.mission_active = False

    def map_callback(self, msg: OccupancyGrid):
        self.map_data = msg
        self.get_logger().debug("Map received")

    def pose_callback(self, msg: PoseWithCovarianceStamped):
        pose_stamped = PoseStamped()
        pose_stamped.header = msg.header
        pose_stamped.pose = msg.pose.pose
        self.current_pose = pose_stamped
        self.get_logger().debug("Current robot pose updated")

    def start_callback(self, msg):
        self.mission_active = True
        self.get_logger().info("Start mission triggered")
        self.explore_map()

    def end_callback(self, msg):
        self.mission_active = False
        self.get_logger().info("End mission triggered")

    def explore_map(self):

        if self.map_data is None:
            self.get_logger().error("No map data received.")
            return

        if self.current_pose is None:
            self.get_logger().error("No current pose received")
            return

        resolution = self.map_data.info.resolution
        origin_x = self.map_data.info.origin.position.x
        origin_y = self.map_data.info.origin.position.y
        width = self.map_data.info.width
        height = self.map_data.info.height
        robot_x = self.current_pose.pose.position.x
        robot_y = self.current_pose.pose.position.y

        self.get_logger().info(robot_x)
        self.get_logger().info(robot_y)
        self.get_logger().info(f"Robot Position: x={robot_x}, y={robot_y}")
        
        candidates = [
            (robot_x, robot_y + 0.5),   
            (robot_x + 0.5, robot_y + 0.5),
            (robot_x + 0.5, robot_y),
            (robot_x + 0.5, robot_y - 0.5),
            (robot_x, robot_y - 0.5),
            (robot_x - 0.5, robot_y - 0.5), 
            (robot_x - 0.5, robot_y),
            (robot_x - 0.5, robot_y + 0.5)
        ]

        def is_free(x, y):
            mx = int((x - origin_x) / resolution)
            my = int((y - origin_y) / resolution)
            if 0 <= mx < width and 0 <= my < height:
                index = my * width + mx
                return self.map_data.data[index] == 100 # TODO : Free space

            return False

        free_candidates = [c for c in candidates if is_free(*c)]

        if not free_candidates:
            self.get_logger().warn("No free candidate points found!")
            return
        
        goal_x, goal_y = free_candidates[0]
        self.get_logger().info(f"Selected random goal: x={goal_x:.2f}, y={goal_y:.2f}")
        
        goal_msg = NavigateToPose.Goal()
        goal_pose = PoseStamped()
        goal_pose.header.frame_id = "map"
        goal_pose.pose.position.x = goal_x
        goal_pose.pose.position.y = goal_y
        #self.goal_pose.header.stamp = self.get_clock().now().to_msg()
        goal_pose.pose.orientation.w = 1.0 # TODO : en avant pour l'instant
        goal_msg.pose = goal_pose

        if not self.nav_client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error("NavigateToPose action server not available!")
            return
        
        send_goal_future = self.nav_client.send_goal_async(goal_msg, feedback_callback=self.feedback_callback)
        send_goal_future.add_done_callback(self.goal_response_callback)
    
    def goal_response_callback(self, future):
        goal_handle = future.result()
        if not goal_handle.accepted:
            self.get_logger().error("Goal rejected by server")
            return

        self.get_logger().info("Goal accepted, waiting for result...")
        result_future = goal_handle.get_result_async()
        result_future.add_done_callback(self.get_result_callback)

    def get_result_callback(self, future):
        result = future.result().result
        self.get_logger().info("Navigation action completed with result: " + str(result))

    def feedback_callback(self, feedback_msg):
        feedback = feedback_msg.feedback
        self.get_logger().debug("Received feedback: " + str(feedback))
    

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
