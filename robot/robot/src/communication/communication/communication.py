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

        # Topics pour la communication avec le robot
        messages_topic = f'/{self.robot_id}/messages'
        self.subscription = self.create_subscription(String, messages_topic, self.messages_callback, 10)

        movement_topic = f'/{self.robot_id}/movement'
        self.movement_publisher = self.create_publisher(String, movement_topic, 10)

        # Communication des données d'odométrie au serveur
        self.position_publisher = self.create_publisher(String, '/robot_odom', 10)
        
        # Souscription à l'odométrie
        odom_topic = f'/{self.robot_id}/odom'
        self.odom_subscription = self.create_subscription(
            Odometry, 
            odom_topic,
            self.odom_callback,
            10
        )
        self.get_logger().info(f"Écoute de l'odométrie sur: {odom_topic}")

    def messages_callback(self, msg):
        try:
            data = json.loads(msg.data)
            action = data.get('action')
            if action == 'start_mission':
                self.movement_publisher.publish(msg)
            elif action == 'end_mission':
                self.movement_publisher.publish(msg)
            else:
                self.movement_publisher.publish(msg)
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement du message: {str(e)}")

    def odom_callback(self, msg):
        try:
            # Envoyer uniquement les données d'odométrie brutes
            odom_data = {
                "robot_id": self.robot_id,
                "odom": {
                    "position": {
                        "x": msg.pose.pose.position.x,
                        "y": msg.pose.pose.position.y,
                        "z": msg.pose.pose.position.z
                    },
                    "orientation": {
                        "x": msg.pose.pose.orientation.x,
                        "y": msg.pose.pose.orientation.y,
                        "z": msg.pose.pose.orientation.z,
                        "w": msg.pose.pose.orientation.w
                    },
                    "timestamp": self.get_clock().now().seconds_nanoseconds()[0]
                }
            }
            
            odom_msg = String()
            odom_msg.data = json.dumps(odom_data)
            self.position_publisher.publish(odom_msg)
            
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