import rclpy
from rclpy.node import Node
from std_msgs.msg import String, Bool
from nav_msgs.msg import Odometry
from rclpy.qos import QoSProfile, QoSReliabilityPolicy, QoSHistoryPolicy
import json
from std_msgs.msg import Empty
import os
import math
import gi
import asyncio
import signal
from os import environ

# Classe de base pour les fonctionnalités communes
class BaseCommunicationController(Node):
    def __init__(self, node_name='communication_controller'):
        super().__init__(node_name)
        self.declare_parameter('robot_id', 'limo1')
        self.robot_id = self.get_parameter('robot_id').value

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

    def messages_callback(self, msg):
        try:
            data = json.loads(msg.data)
            command = data.get('action', '')

            if command in ['start_mission', 'return_to_base', 'end_mission']:
                topic_name = f'/{self.robot_id}/{command}'
                publisher = self.create_publisher(Empty, topic_name, 10)
                empty_msg = Empty()
                publisher.publish(empty_msg)
                self.get_logger().info(f"Sent {command} to topic {topic_name}")
            else:
                self.get_logger().info("Command not recognized")

        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement du message: {str(e)}")

# Classe pour la simulation Gazebo
class GazeboCommunicationController(BaseCommunicationController):
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
            
        except Exception as e:
            self.get_logger().error(f"Erreur lors du traitement de l'odométrie: {str(e)}")

# Classe pour les robots physiques
class PhysicalCommunicationController(BaseCommunicationController):
    def __init__(self):
        super().__init__()
        if "DISPLAY" not in environ:
            environ["DISPLAY"] = ":1"

        gi.require_version('AppIndicator3', '0.1')
        gi.require_version('Gtk', '3.0')
        gi.require_version('GLib', '2.0')
        from gi.repository import AppIndicator3, Gtk, GLib
        from .display_controller import DisplayWindow

        self.other_robot_id = 'limo2' if self.robot_id == 'limo1' else 'limo1'
        self.p2p_active = False
        self.is_relay = False
        self.other_robot_odom = None
        self.initial_position = None
        self.current_distance = None
        self.other_distance = None
        
        # Interface d'affichage
        self.display = DisplayWindow()

        # Configuration des topics P2P et des autres fonctionnalités
        self._setup_p2p()
        self._setup_gtk()

    def _setup_p2p(self):
        # Topics P2P
        p2p_command_topic = f'/{self.robot_id}/p2p_command'
        self.p2p_command_sub = self.create_subscription(
            Bool,
            p2p_command_topic,
            self.p2p_command_callback,
            10
        )

        p2p_odom_relay_topic = f'/{self.robot_id}/p2p_odom_relay'
        self.p2p_odom_pub = self.create_publisher(String, p2p_odom_relay_topic, 10)
        
        other_p2p_odom_topic = f'/{self.other_robot_id}/p2p_odom_relay'
        self.p2p_odom_sub = self.create_subscription(
            String,
            other_p2p_odom_topic,
            self.p2p_odom_callback,
            10
        )

        p2p_status_topic = f'/{self.robot_id}/p2p_status'
        self.p2p_status_pub = self.create_publisher(String, p2p_status_topic, 10)
        
        other_p2p_status_topic = f'/{self.other_robot_id}/p2p_status'
        self.p2p_status_sub = self.create_subscription(
            String,
            other_p2p_status_topic,
            self.p2p_status_callback,
            10
        )

    def _setup_gtk(self):
        from gi.repository import AppIndicator3, Gtk
        self.indicator = AppIndicator3.Indicator.new(
            f"robot_{self.robot_id}_indicator",
            "dialog-information-symbolic",
            AppIndicator3.IndicatorCategory.APPLICATION_STATUS
        )
        self.indicator.set_status(AppIndicator3.IndicatorStatus.PASSIVE)
        self.indicator.set_menu(Gtk.Menu())

    # Implémentation des callbacks P2P et autres méthodes pour les robots physiques
    # [Le reste du code de la version physique reste identique]
    
def main(args=None):
    rclpy.init(args=args)
    
    # Utiliser la variable d'environnement SIMULATION pour déterminer le mode
    is_simulation = os.environ.get('SIMULATION', 'false').lower() == 'true'
    
    if is_simulation:
        node = GazeboCommunicationController()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        finally:
            node.destroy_node()
            rclpy.shutdown()
    else:
        node = PhysicalCommunicationController()
        asyncio.run(main_async(node))

async def main_async(node):
    from gi.repository import GLib
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
        try:
            main_loop.quit()
            node.display.destroy()  # Fermer la fenêtre GTK
            node.destroy_node()
            rclpy.shutdown()
        except Exception as e:
            print(f"Erreur lors de l'arrêt: {str(e)}")

async def spin_ros_node(node, sleep_interval: float = 0.1):
    """Fait tourner le noeud ROS de manière asynchrone"""
    while rclpy.ok():
        try:
            rclpy.spin_once(node, timeout_sec=0)
            await asyncio.sleep(sleep_interval)
        except Exception as e:
            node.get_logger().error(f"Erreur dans la boucle principale: {str(e)}")
            break

if __name__ == '__main__':
    main()