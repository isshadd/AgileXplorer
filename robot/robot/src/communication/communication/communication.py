import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from nav_msgs.msg import Odometry
from rclpy.qos import QoSProfile, QoSReliabilityPolicy, QoSHistoryPolicy
import json

class CommunicationController(Node):

    def __init__(self):
        super().__init__('communication_controller')
        self.declare_parameter('robot_id', '102robot1')
        self.robot_id = self.get_parameter('robot_id').value

        # Topics pour la communication des commandes
        messages_topic = f'/{self.robot_id}/messages'
        self.subscription = self.create_subscription(String, messages_topic, self.messages_callback, 10)
        movement_topic = f'/{self.robot_id}/movement'
        self.movement_publisher = self.create_publisher(String, movement_topic, 10)

        # Communication des données d'odométrie
        odom_qos = QoSProfile(
            reliability=QoSReliabilityPolicy.BEST_EFFORT,
            history=QoSHistoryPolicy.KEEP_LAST,
            depth=10
        )

        # Souscription à l'odométrie avec le bon QoS
        odom_topic = f'/{self.robot_id}/odom'
        self.odom_subscription = self.create_subscription(
            Odometry, 
            odom_topic,
            self.odom_callback,
            odom_qos
        )
        self.get_logger().info(f"Souscription à l'odométrie sur: {odom_topic}")

        # Publication vers le serveur
        self.position_publisher = self.create_publisher(String, '/robot_odom', 10)

    def messages_callback(self, msg):
        try:
            data = json.loads(msg.data)
            action = data.get('action')
            if action == 'start_mission' or action == 'end_mission':
                self.movement_publisher.publish(msg)
            else:
                self.movement_publisher.publish(msg)
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement du message: {str(e)}")

    def odom_callback(self, msg):
        try:
            # Transmettre directement les données d'odométrie
            odom_data = {
                "robot_id": self.robot_id,
                "odom": {
                    "position": {
                        "x": msg.pose.pose.position.x,
                        "y": msg.pose.pose.position.y
                    },
                    "orientation": {
                        "x": msg.pose.pose.orientation.x,
                        "y": msg.pose.pose.orientation.y,
                        "z": msg.pose.pose.orientation.z,
                        "w": msg.pose.pose.orientation.w
                    },
                    "timestamp": self.get_clock().now().nanoseconds / 1e9
                }
            }
            
            self.get_logger().debug(f"Odométrie reçue: x={msg.pose.pose.position.x}, y={msg.pose.pose.position.y}")
            
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