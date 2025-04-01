import rclpy
import math
import gi
import asyncio
import signal
from rclpy.node import Node
from std_msgs.msg import String, Bool
from nav_msgs.msg import Odometry
from rclpy.qos import QoSProfile, QoSReliabilityPolicy, QoSHistoryPolicy
import json
from std_msgs.msg import Empty
from os import environ

# Configuration pour l'affichage
if "DISPLAY" not in environ:
    environ["DISPLAY"] = ":1"

gi.require_version('AppIndicator3', '0.1')
gi.require_version('Gtk', '3.0')
gi.require_version('GLib', '2.0')
from gi.repository import AppIndicator3, Gtk, GLib

class Icon:
    INITIAL = "dialog-information-symbolic"
    NEAR = "emblem-ok-symbolic"
    FAR = "dialog-warning-symbolic"

def calculate_distance(pose):
    """Calcule la distance euclidienne depuis l'origine"""
    return math.sqrt(pose.position.x ** 2 + pose.position.y ** 2)

class CommunicationController(Node):

    def __init__(self):
        super().__init__('communication_controller')
        self.declare_parameter('robot_id', 'limo1')
        self.robot_id = self.get_parameter('robot_id').value
        self.other_robot_id = 'limo2' if self.robot_id == 'limo1' else 'limo1'

        # État P2P
        self.p2p_active = False
        self.initial_position = None
        self.current_distance = None
        self.other_distance = None

        # Topics pour la communication des commandes
        messages_topic = f'/{self.robot_id}/messages'
        self.subscription = self.create_subscription(String, messages_topic, self.messages_callback, 10)
        movement_topic = f'/{self.robot_id}/movement'
        self.movement_publisher = self.create_publisher(String, movement_topic, 10)

        # Configuration du QoS pour l'odométrie
        odom_qos = QoSProfile(
            reliability=QoSReliabilityPolicy.BEST_EFFORT,
            history=QoSHistoryPolicy.KEEP_LAST,
            depth=10
        )

        # Souscription à l'odométrie
        odom_topic = f'/{self.robot_id}/odom'
        self.odom_subscription = self.create_subscription(
            Odometry,
            odom_topic,
            self.odom_callback,
            odom_qos
        )
        self.get_logger().info(f"Souscription à l'odométrie sur: {odom_topic}")

        # Publication des données d'odométrie vers le serveur
        self.position_publisher = self.create_publisher(String, '/robot_odom', 10)

        # Topics P2P
        p2p_command_topic = f'/{self.robot_id}/p2p_command'
        self.p2p_command_sub = self.create_subscription(
            Bool,
            p2p_command_topic,
            self.p2p_command_callback,
            10
        )

        # Communication P2P directe
        p2p_distance_topic = f'/{self.robot_id}/p2p_distance'
        self.p2p_distance_pub = self.create_publisher(String, p2p_distance_topic, 10)
        other_p2p_distance_topic = f'/{self.other_robot_id}/p2p_distance'
        self.p2p_distance_sub = self.create_subscription(
            String,
            other_p2p_distance_topic,
            self.p2p_distance_callback,
            10
        )

        # Initialisation de l'indicateur GTK
        self.indicator = AppIndicator3.Indicator.new(
            f"robot_{self.robot_id}_indicator",
            Icon.INITIAL,
            AppIndicator3.IndicatorCategory.APPLICATION_STATUS
        )
        self.indicator.set_status(AppIndicator3.IndicatorStatus.PASSIVE)
        self.indicator.set_menu(Gtk.Menu())

    def messages_callback(self, msg):
        try:
            data = json.loads(msg.data)
            # Transmission directe des commandes au contrôleur
            self.movement_publisher.publish(msg)
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement du message: {str(e)}")

    def p2p_command_callback(self, msg):
        """Gestion de l'activation/désactivation du mode P2P"""
        self.p2p_active = msg.data
        if self.p2p_active:
            self.get_logger().info("Mode P2P activé")
            self.indicator.set_status(AppIndicator3.IndicatorStatus.ACTIVE)
            self.indicator.set_icon(Icon.INITIAL)
        else:
            self.get_logger().info("Mode P2P désactivé")
            self.indicator.set_status(AppIndicator3.IndicatorStatus.PASSIVE)
            self.initial_position = None
            self.current_distance = None
            self.other_distance = None

    def p2p_distance_callback(self, msg):
        """Réception de la distance de l'autre robot"""
        if not self.p2p_active:
            return
        
        try:
            data = json.loads(msg.data)
            self.other_distance = data['distance']
            self.compare_distances()
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement de la distance P2P: {str(e)}")

    def compare_distances(self):
        """Compare les distances et met à jour l'icône"""
        if self.current_distance is None or self.other_distance is None:
            return

        if self.current_distance > self.other_distance:
            self.indicator.set_icon(Icon.FAR)
            self.get_logger().info("Ce robot est le plus éloigné")
        else:
            self.indicator.set_icon(Icon.NEAR)
            self.get_logger().info("Ce robot est le plus proche")

    def odom_callback(self, msg):
        try:
            # Transmission des données brutes d'odométrie
            odom_data = {
                "robot_id": self.robot_id,
                "odom": {
                    "position": {
                        "x": msg.pose.pose.position.x,
                        "y": msg.pose.pose.position.y
                    }
                }
            }
            
            position_msg = String()
            position_msg.data = json.dumps(odom_data)
            self.position_publisher.publish(position_msg)

            # Gestion P2P
            if self.p2p_active:
                # Sauvegarde de la position initiale si nécessaire
                if self.initial_position is None:
                    self.initial_position = msg.pose.pose

                # Calcul de la distance depuis le point initial
                current_pose = msg.pose.pose
                dx = current_pose.position.x - self.initial_position.position.x
                dy = current_pose.position.y - self.initial_position.position.y
                self.current_distance = math.sqrt(dx**2 + dy**2)

                # Envoi de la distance aux autres robots
                distance_msg = String()
                distance_msg.data = json.dumps({
                    "robot_id": self.robot_id,
                    "distance": self.current_distance
                })
                self.p2p_distance_pub.publish(distance_msg)
                
        except Exception as e:
            self.get_logger().error(f"Erreur lors du traitement de l'odométrie: {str(e)}")

async def spin_ros_node(node: CommunicationController, sleep_interval: float = 0.1):
    """Fait tourner le noeud ROS de manière asynchrone"""
    while rclpy.ok():
        rclpy.spin_once(node, timeout_sec=0)
        await asyncio.sleep(sleep_interval)

async def main_async():
    """Fonction principale asynchrone"""
    rclpy.init()
    node = CommunicationController()

    # Gestion du SIGINT (Ctrl+C)
    signal.signal(signal.SIGINT, signal.default_int_handler)
    
    # Création de la boucle principale GTK
    main_loop = GLib.MainLoop()

    try:
        # Obtention de la boucle asyncio
        loop = asyncio.get_event_loop()
        # Création de la tâche pour le noeud ROS
        loop.create_task(spin_ros_node(node))
        # Exécution de la boucle GTK de manière asynchrone
        await loop.run_in_executor(None, main_loop.run)
    except KeyboardInterrupt:
        node.get_logger().info("Arrêt du noeud...")
    finally:
        main_loop.quit()
        node.destroy_node()
        rclpy.shutdown()

def main():
    """Point d'entrée principal"""
    asyncio.run(main_async())

if __name__ == '__main__':
    main()