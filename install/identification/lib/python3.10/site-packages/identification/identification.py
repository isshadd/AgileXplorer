import rclpy
from rclpy.node import Node
from std_msgs.msg import Empty
import subprocess
import os

class IdentifyNode(Node):
    def __init__(self):
        super().__init__('identify_node')
        self.declare_parameter('robot_id', 'limo1')
        self.robot_id = self.get_parameter('robot_id').value
    
        identify_topic = f'/{self.robot_id}/identify'
        self.subscription = self.create_subscription(Empty, identify_topic, self.identify_callback, 10)

    def identify_callback(self, msg):
        self.get_logger().info(f"Identification demandée pour {self.robot_id} : lancement du son.")
        sound_file = '/home/equipe102/Desktop/INF3995-102/robot/common/son_identification.wav'
        if os.path.exists(sound_file):
            subprocess.Popen(['aplay', sound_file])
        else:
            self.get_logger().error(f"Fichier son introuvable: {sound_file}")

def main(args=None):
    rclpy.init(args=args)
    node = IdentifyNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
