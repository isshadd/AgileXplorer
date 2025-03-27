import rclpy
import random
import math

from rclpy.node import Node
from rclpy.action import ActionClient

from nav_msgs.msg import OccupancyGrid, Odometry  # Updated import
from geometry_msgs.msg import PoseStamped, PoseWithCovarianceStamped
from nav2_msgs.action import NavigateToPose
from std_msgs.msg import Empty

class MissionNode(Node):
    def __init__(self):
        super().__init__('mission_node')
        self.declare_parameter('robot_id', 'limo1')
        self.robot_id = self.get_parameter('robot_id').value
        
        # f'/{self.robot_id}/odom' 
        start_topic = f'/{self.robot_id}/start_mission'
        end_topic = f'/{self.robot_id}/end_mission'
        self.map_frame = f'{self.robot_id}/map' # TODO : changer si pas de namspace
        odom_topic = f'/odom'   # TODO : changer si pas de namspace

        self.start_subscription = self.create_subscription(Empty, start_topic, self.start_callback, 10)
        self.end_subscription = self.create_subscription(Empty, end_topic, self.end_callback, 10)
        self.map_subscription = self.create_subscription(OccupancyGrid, self.map_frame, self.map_callback, 10)
        self.pose_subscription = self.create_subscription(Odometry, odom_topic, self.pose_callback, 10)

        self.nav_client = ActionClient(self, NavigateToPose, f'/navigate_to_pose') # TODO : changer si pas de namspace

        self.mission_active = False
        self.isFirstOdom = True
        self.initial_pose = None
        self.current_pose = None
        self.map_data = None
        self.timer = None
        self.current_goal_handle = None

    def map_callback(self, msg: OccupancyGrid):
        self.map_data = msg

    def pose_callback(self, msg: Odometry): 
        pose_stamped = PoseStamped()
        pose_stamped.header = msg.header
        pose_stamped.pose = msg.pose.pose 

        if self.isFirstOdom == True:
            self.isFirstOdom = False
            self.initial_pose = pose_stamped
        self.current_pose = pose_stamped

    def start_callback(self, msg):
        self.mission_active = True
        self.get_logger().info("Starting new mission")
        self.timer = self.create_timer(5.0, self.timer_callback)
        self.explore_map()

    def timer_callback(self):
        if self.mission_active:
            if self.current_goal_handle is not None:
                self.get_logger().info("Canceling current goal")
                self.current_goal_handle.cancel_goal_async()
                self.current_goal_handle = None
            self.explore_map()

    def end_callback(self, msg):
        self.mission_active = False
        self.get_logger().info(f"Ending mission, returning to: x={self.initial_pose.pose.position.x:.2f}, y={self.initial_pose.pose.position.y :.2f}")

        goal_msg = NavigateToPose.Goal()
        goal_pose = PoseStamped()
        goal_pose.header.frame_id = "map" #self.map_frame
        goal_pose.header.stamp = self.get_clock().now().to_msg()
        goal_pose.pose.position.x = self.initial_pose.pose.position.x
        goal_pose.pose.position.y = self.initial_pose.pose.position.y
        goal_pose.pose.orientation.w = 1.0
        goal_msg.pose = goal_pose

        send_goal_future = self.nav_client.send_goal_async(goal_msg)
        send_goal_future.add_done_callback(self.goal_response_callback)

        #self.get_logger().info("Canceling current navigation goal")
        #self.current_goal_handle.cancel_goal_async()
        #self.current_goal_handle = None

    def explore_map(self):
        if self.map_data is None:
            self.get_logger().error("No map received.")
            return
        if self.current_pose is None:
            self.get_logger().error("No position received")
            return

        resolution = self.map_data.info.resolution
        origin_x = self.map_data.info.origin.position.x
        origin_y = self.map_data.info.origin.position.y
        width = self.map_data.info.width
        height = self.map_data.info.height
        robot_x = self.current_pose.pose.position.x
        robot_y = self.current_pose.pose.position.y
        
        candidates = []
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
                return self.map_data.data[index] == 0
            return False
        free_candidates = [c for c in candidates if is_free(*c)]

        if not free_candidates:
            self.get_logger().warn("No free candidate points found, remove obstacles!")
            return
        goal_x, goal_y = free_candidates[0]
        self.get_logger().info(f"Selected goal: x={goal_x:.2f}, y={goal_y:.2f}")
        
        goal_msg = NavigateToPose.Goal()
        goal_pose = PoseStamped()
        goal_pose.header.frame_id = "map" # self.map_frame
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
        # self.explore_map()

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
