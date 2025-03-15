import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from nav_msgs.msg import Odometry
import json

class CommunicationController(Node):

    def __init__(self):
        super().__init__('communication_controller')
        self.declare_parameter('robot_id', '102robot1')  # ID correct du robot
        self.robot_id = self.get_parameter('robot_id').value

        # Topics pour la communication avec le robot
        messages_topic = f'/{self.robot_id}/messages'
        self.subscription = self.create_subscription(String, messages_topic, self.messages_callback, 10)

        movement_topic = f'/{self.robot_id}/movement'
        self.movement_publisher = self.create_publisher(String, movement_topic, 10)

        # Communication avec le serveur
        self.position_publisher = self.create_publisher(String, '/server_feedback', 10)
        self.mission_active = False

        # Souscription à l'odométrie avec le bon namespace
        odom_topic = f'/{self.robot_id}/odom'  # Correspond au remapping dans limo_base.launch.py
        self.odom_subscription = self.create_subscription(
            Odometry, 
            odom_topic,
            self.odom_callback,
            10
        )
        self.get_logger().info(f"Écoute de l'odométrie sur: {odom_topic}")
        self.get_logger().info("Le noeud va maintenant recevoir les données d'odométrie du robot...")

    def messages_callback(self, msg):
        try:
            data = json.loads(msg.data)
            action = data.get('action')
            if action == 'start_mission':
                self.mission_active = True
            elif action == 'end_mission':
                self.mission_active = False

            self.movement_publisher.publish(msg)
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement du message: {str(e)}")

    def odom_callback(self, msg):
        try:
            # Log pour déboguer l'odométrie
            self.get_logger().debug(f"Odométrie reçue - Position: ({msg.pose.pose.position.x}, {msg.pose.pose.position.y})")
            
            # Publication de la position
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