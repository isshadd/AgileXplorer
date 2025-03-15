import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from nav_msgs.msg import Odometry
import json

class CommunicationController(Node):

    def __init__(self):
        super().__init__('communication_controller')
        self.declare_parameter('robot_id', 'robot1_102')
        self.robot_id = self.get_parameter('robot_id').value

        messages_topic = f'/{self.robot_id}/messages'
        self.subscription = self.create_subscription(String, messages_topic, self.messages_callback, 10)
        self.get_logger().info(f"Subscribed to: {messages_topic}")

        movement_topic = f'/{self.robot_id}/movement'
        self.movement_publisher = self.create_publisher(String, movement_topic, 10)
        self.get_logger().info(f"Publishing to: {movement_topic}")

        # Souscription au topic d'odométrie
        self.odom_subscription = self.create_subscription(Odometry, '/odom', self.odom_callback, 10)
        self.get_logger().info("Subscribed to odometry topic: /odom")

        # Publisher pour envoyer la position au serveur
        self.position_publisher = self.create_publisher(String, '/server_feedback', 10)
        self.mission_active = False

    def messages_callback(self, msg):
        try:
            data = json.loads(msg.data)
            action = data.get('action')
            if action == 'start_mission':
                self.mission_active = True
                self.get_logger().info(f"Mission démarrée pour {self.robot_id}")
            elif action == 'end_mission':
                self.mission_active = False
                self.get_logger().info(f"Mission arrêtée pour {self.robot_id}")
            else:
                self.get_logger().info(f"Transmitting command on {self.robot_id}/movement: {msg.data}")

            self.movement_publisher.publish(msg)
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement du message: {str(e)}")

    def odom_callback(self, msg):
        try:
            # Création du message de position depuis l'odométrie
            position_data = {
                "robot_id": self.robot_id,
                "position": {
                    "x": msg.pose.pose.position.x,
                    "y": msg.pose.pose.position.y,
                    "timestamp": self.get_clock().now().nanoseconds / 1e9
                }
            }
            
            # Envoi des données de position au serveur
            server_msg = String()
            server_msg.data = json.dumps(position_data)
            self.position_publisher.publish(server_msg)
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