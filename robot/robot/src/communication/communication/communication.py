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
        self.is_relay = False
        self.last_p2p_message_time = None
        self.p2p_timeout = 5.0  # 5 secondes de timeout
        self.other_robot_odom = None

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

        # Topics pour le relais P2P
        p2p_odom_relay_topic = f'/{self.robot_id}/p2p_odom_relay'
        self.p2p_odom_pub = self.create_publisher(String, p2p_odom_relay_topic, 10)
        
        other_p2p_odom_topic = f'/{self.other_robot_id}/p2p_odom_relay'
        self.p2p_odom_sub = self.create_subscription(
            String,
            other_p2p_odom_topic,
            self.p2p_odom_callback,
            10
        )

        # Topic pour vérifier si l'autre robot est en mode P2P
        p2p_status_topic = f'/{self.robot_id}/p2p_status'
        self.p2p_status_pub = self.create_publisher(String, p2p_status_topic, 10)
        
        other_p2p_status_topic = f'/{self.other_robot_id}/p2p_status'
        self.p2p_status_sub = self.create_subscription(
            String,
            other_p2p_status_topic,
            self.p2p_status_callback,
            10
        )

        # Timer pour vérifier le timeout P2P
        self.create_timer(1.0, self.check_p2p_timeout)

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
        self.get_logger().debug(f"Reçu commande P2P: {msg.data}")
        if msg.data and self.is_relay:
            self.get_logger().warn("Ce robot est déjà un relais, impossible d'activer le mode P2P")
            return

        self.p2p_active = msg.data
        self.get_logger().debug(f"État P2P mis à jour: {self.p2p_active}")
        
        if self.p2p_active:
            self.get_logger().info("Mode P2P activé")
            self.indicator.set_status(AppIndicator3.IndicatorStatus.ACTIVE)
            self.indicator.set_icon(Icon.INITIAL)
            # Publier le statut P2P
            self.get_logger().debug("Publication du statut P2P (actif)")
            self.publish_p2p_status()
        else:
            self.get_logger().info("Mode P2P désactivé")
            self.indicator.set_status(AppIndicator3.IndicatorStatus.PASSIVE)
            self.is_relay = False
            self.other_robot_odom = None
            self.get_logger().debug("Publication du statut P2P (inactif)")
            self.publish_p2p_status()

    def p2p_status_callback(self, msg):
        """Réception du statut P2P de l'autre robot"""
        try:
            data = json.loads(msg.data)
            if data['p2p_active']:
                self.is_relay = True
                self.get_logger().info("Devenu relais pour l'autre robot")
            else:
                self.is_relay = False
                self.other_robot_odom = None
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement du statut P2P: {str(e)}")

    def p2p_odom_callback(self, msg):
        """Réception des données d'odométrie de l'autre robot"""
        try:
            self.last_p2p_message_time = self.get_clock().now()
            data = json.loads(msg.data)
            self.other_robot_odom = data
            if self.is_relay:
                # Publier les données au serveur
                self.position_publisher.publish(msg)
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement de l'odom P2P: {str(e)}")

    def check_p2p_timeout(self):
        """Vérifie si la communication P2P est active"""
        if self.p2p_active or self.is_relay:
            if self.last_p2p_message_time is not None:
                current_time = self.get_clock().now()
                time_diff = (current_time - self.last_p2p_message_time).nanoseconds / 1e9
                if time_diff > self.p2p_timeout:
                    self.get_logger().warn("Timeout P2P détecté!")
                    self.p2p_active = False
                    self.is_relay = False
                    self.other_robot_odom = None
                    self.publish_p2p_status()

    def publish_p2p_status(self):
        """Publie le statut P2P actuel"""
        try:
            self.get_logger().debug("Préparation du message de statut P2P")
            status_msg = String()
            status_msg.data = json.dumps({
                "robot_id": self.robot_id,
                "p2p_active": self.p2p_active
            })
            self.get_logger().debug(f"Publication du message de statut: {status_msg.data}")
            self.p2p_status_pub.publish(status_msg)
            self.get_logger().debug("Message de statut P2P publié")
        except Exception as e:
            self.get_logger().error(f"Erreur lors de la publication du statut P2P: {str(e)}")

    def odom_callback(self, msg):
        try:
            # Préparation des données d'odométrie
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

            # En mode P2P, envoyer uniquement à l'autre robot
            if self.p2p_active:
                self.p2p_odom_pub.publish(position_msg)
            # Si relais ou mode normal, envoyer au serveur
            elif self.is_relay:
                # Envoyer ses propres données au serveur
                self.position_publisher.publish(position_msg)
                # Si on a des données de l'autre robot, les envoyer aussi
                if self.other_robot_odom is not None:
                    other_msg = String()
                    other_msg.data = json.dumps(self.other_robot_odom)
                    self.position_publisher.publish(other_msg)
            else:
                # Mode normal : envoyer directement au serveur
                self.position_publisher.publish(position_msg)
                
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