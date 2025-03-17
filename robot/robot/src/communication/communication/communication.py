import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from nav_msgs.msg import Odometry
import json
from std_msgs.msg import Empty

class CommunicationController(Node):

    def __init__(self):
        super().__init__('communication_controller')
        self.declare_parameter('robot_id', 'limo1')
        self.robot_id = self.get_parameter('robot_id').value

        # Topics pour le contrôle du robot
        messages_topic = f'/{self.robot_id}/messages'
        self.subscription = self.create_subscription(String, messages_topic, self.messages_callback, 10)

        movement_topic = f'/{self.robot_id}/movement'
        self.movement_publisher = self.create_publisher(String, movement_topic, 10)

        self.odom_subscription = self.create_subscription(Odometry, '/odom', self.odom_callback, 10)
        start_topic = f'/{self.robot_id}/start_mission'
        end_topic = f'/{self.robot_id}/end_mission'
        self.start_mission_publisher = self.create_publisher(Empty, start_topic, 10)
        self.end_mission_publisher = self.create_publisher(Empty, end_topic, 10)

        self.feedback_subscription = self.create_subscription(String, '/feedback', self.feedback_callback, 10)
        self.get_logger().info(f"Subscribed to odometry topic: {odom_topic}")
        self.server_feedback_publisher = self.create_publisher(String, '/server_feedback', 10)
        self.mission_active = False
        self.empty = Empty()

        # Souscription à l'odométrie avec le bon namespace
        odom_topic = f'/{self.robot_id}/odom'  # Correspond au remapping dans limo_base.launch.py
        # Souscription à l'odométrie du robot
        odom_topic = f'/{self.robot_id}/odom'
        self.odom_subscription = self.create_subscription(
            Odometry, 
            odom_topic,
            self.odom_callback,
            10
        )
        self.get_logger().info(f"Écoute de l'odométrie sur: {odom_topic}")

        # Communication avec le serveur
        self.position_publisher = self.create_publisher(String, '/server_feedback', 10)

    def messages_callback(self, msg):
        try:
            data = json.loads(msg.data)
            action = data.get('action')
            if action == 'start_mission':
                self.mission_active = True
                self.start_mission_publisher.publish(self.empty)
            elif action == 'end_mission':
                self.mission_active = False
                self.end_mission_publisher.publish(self.empty)
            else:
                self.get_logger().info(f"Transmitting command on {self.robot_id}/movement: {msg.data}")
                self.movement_publisher.publish(msg)
            self.movement_publisher.publish(msg)
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement du message: {str(e)}")

    def odom_callback(self, msg):
        try:
            # Envoi de la position au serveur
            position_data = {
                "robot_id": self.robot_id,
                "position": {
                    "x": msg.pose.pose.position.x,
                    "y": msg.pose.pose.position.y,
                    "timestamp": self.get_clock().now().seconds_nanoseconds()[0]
                }
            }
            
            feedback_msg = String()
            feedback_msg.data = json.dumps(position_data)
            self.position_publisher.publish(feedback_msg)
        except Exception as e:
            self.get_logger().error(f"Erreur lors du traitement de l'odométrie: {str(e)}")

def main(args=None):
    rclpy.init(args=args)
    node = CommunicationController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()