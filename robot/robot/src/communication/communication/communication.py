import rclpy
from rclpy.node import Node
from std_msgs.msg import String
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
    def __init__(self):
        super().__init__()
        self.get_logger().info("Mode simulation: P2P désactivé")

    def odom_callback(self, msg):
        try:
            # En mode simulation, on publie toujours directement au serveur
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
            
    # Le mode P2P n'est pas disponible en simulation
    def p2p_command_callback(self, msg):
        self.get_logger().warn("Le mode P2P n'est pas disponible en simulation")

# Classe pour les robots physiques
class PhysicalCommunicationController(BaseCommunicationController):
    def __init__(self):
        super().__init__()
        if "DISPLAY" not in environ:
            environ["DISPLAY"] = ":1"

        # Configuration des dépendances GTK
        gi.require_version('AppIndicator3', '0.1')
        gi.require_version('Gtk', '3.0')
        gi.require_version('GLib', '2.0')
        from gi.repository import AppIndicator3, Gtk, GLib
        from .display_controller import DisplayWindow
        
        # Sauvegarde des classes GTK nécessaires
        self.AppIndicator3 = AppIndicator3
        self.Gtk = Gtk
        self.GLib = GLib

        self.other_robot_id = 'limo2' if self.robot_id == 'limo1' else 'limo1'
        self.p2p_active = False
        self.is_relay = False
        self.other_robot_odom = None
        self.initial_position = None
        self.current_distance = 0
        self.other_distance = 0
        self.last_update_time = None
        
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
        self.indicator = self.AppIndicator3.Indicator.new(
            f"robot_{self.robot_id}_indicator",
            "dialog-information-symbolic",
            self.AppIndicator3.IndicatorCategory.APPLICATION_STATUS
        )
        self.indicator.set_status(self.AppIndicator3.IndicatorStatus.PASSIVE)
        self.indicator.set_menu(self.Gtk.Menu())

    def p2p_command_callback(self, msg):
        """Gestion de l'activation/désactivation du mode P2P"""
        try:
            if msg.data and self.is_relay:
                self.get_logger().warn("Ce robot est déjà un relais, impossible d'activer le mode P2P")
                return

            self.p2p_active = msg.data
            self.get_logger().debug(f"État P2P mis à jour: {self.p2p_active}")
            
            if self.p2p_active:
                self.get_logger().info("Mode P2P activé")
                self.indicator.set_status(self.AppIndicator3.IndicatorStatus.ACTIVE)
                self._update_display()
                # Publier le statut P2P
                self.publish_p2p_status()
            else:
                self.get_logger().info("Mode P2P désactivé")
                self.indicator.set_status(self.AppIndicator3.IndicatorStatus.PASSIVE)
                self.is_relay = False
                self.other_robot_odom = None
                self._update_display()
                self.publish_p2p_status()
        except Exception as e:
            self.get_logger().error(f"Erreur dans p2p_command_callback: {str(e)}")

    def p2p_status_callback(self, msg):
        """Réception du statut P2P de l'autre robot"""
        try:
            data = json.loads(msg.data)
            self.get_logger().debug(f"Reçu statut P2P de {data['robot_id']}: {data['p2p_active']}")
            self.get_logger().debug(f"État actuel - P2P: {self.p2p_active}, Relais: {self.is_relay}")
            
            # Si l'autre robot active P2P
            if data['p2p_active']:
                if not self.p2p_active:  # Seulement si on n'est pas déjà en mode P2P
                    self.is_relay = True
                    self.initial_position = None  # Réinitialisation du point de référence
                    self.get_logger().info(f"Robot {self.robot_id} devient relais pour {data['robot_id']}")
                    self._update_display()
                    self.get_logger().debug("Configuration du relais terminée")
            else:  # Si l'autre robot désactive P2P
                if self.is_relay:  # Si on était en mode relais
                    self.is_relay = False
                    self.other_robot_odom = None
                    self.get_logger().info(f"Mode relais désactivé pour {self.robot_id}")
                    self._update_display()
                    self.initial_position = None
                    self.current_distance = 0
                    self.other_distance = 0
                    self.get_logger().debug("Nettoyage du mode relais terminé")
            
            self.get_logger().debug(f"Nouvel état - P2P: {self.p2p_active}, Relais: {self.is_relay}")
        except Exception as e:
            self.get_logger().error(f"Erreur dans p2p_status_callback: {str(e)}")

    def publish_p2p_status(self):
        """Publie le statut P2P actuel"""
        try:
            status_msg = String()
            status_msg.data = json.dumps({
                "robot_id": self.robot_id,
                "p2p_active": self.p2p_active
            })
            self.p2p_status_pub.publish(status_msg)
            self.get_logger().debug("Statut P2P publié")
        except Exception as e:
            self.get_logger().error(f"Erreur lors de la publication du statut P2P: {str(e)}")

    def p2p_odom_callback(self, msg):
        """Réception des données d'odométrie de l'autre robot"""
        try:
            data = json.loads(msg.data)
            self.get_logger().debug(f"Reçu données P2P de {data['robot_id']}")
            self.other_robot_odom = data
            
            if self.is_relay:
                self.get_logger().debug(f"Mode relais actif: republication des données de {data['robot_id']}")
                # Publier les données au serveur
                self.position_publisher.publish(msg)
            else:
                self.get_logger().debug(f"Mode relais inactif: données P2P ignorées")
                
            self.get_logger().debug(f"Position reçue - X: {data['odom']['position']['x']:.2f}, Y: {data['odom']['position']['y']:.2f}")
            self._update_display()
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement de l'odom P2P: {str(e)}")

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

            # Toujours publier sur le topic P2P pour maintenir la communication
            self.p2p_odom_pub.publish(position_msg)
            
            # Publication selon le mode
            if not self.p2p_active and not self.is_relay:
                # En mode normal, publication directe au serveur
                self.position_publisher.publish(position_msg)
                
            # Mise à jour de l'affichage
            self._update_display()
            
        except Exception as e:
            self.get_logger().error(f"Erreur lors du traitement de l'odométrie: {str(e)}")

    def _update_display(self):
        """Met à jour l'affichage en fonction des distances actuelles"""
        try:
            if not hasattr(self, 'display'):
                return
                
            if self.other_robot_odom is None:
                self.get_logger().debug("Pas d'information de l'autre robot, affichage par défaut")
                self.display.set_default_icon()
                return
                
            other_distance = self.other_robot_odom.get('distance', 0)
            
            self.get_logger().debug(f"Distance actuelle: {self.current_distance}, autre robot: {other_distance}")
            
            if self.current_distance > other_distance:
                self.display.set_far_icon()
                self.get_logger().debug("Je suis plus loin du point de départ")
            else:
                self.display.set_near_icon()
                self.get_logger().debug("Je suis plus proche du point de départ")
        except Exception as e:
            self.get_logger().error(f"Erreur lors de la mise à jour de l'affichage: {str(e)}")

def main(args=None):
    try:
        rclpy.init(args=args)
        
        # Utiliser la variable d'environnement SIMULATION pour déterminer le mode
        is_simulation = os.environ.get('SIMULATION', 'false').lower() == 'true'
        print(f"[DEBUG] Variable SIMULATION = {os.environ.get('SIMULATION')}")
        print(f"[DEBUG] Mode simulation activé: {is_simulation}")
        
        if is_simulation:
            print("[INFO] Démarrage du contrôleur en mode simulation (Gazebo)")
            try:
                node = GazeboCommunicationController()
                print("[INFO] Contrôleur Gazebo créé avec succès")
                rclpy.spin(node)
            except Exception as e:
                print(f"[ERROR] Erreur lors de l'initialisation du contrôleur Gazebo: {str(e)}")
                raise
        else:
            print("[INFO] Démarrage du contrôleur en mode robot physique")
            try:
                node = PhysicalCommunicationController()
                print("[INFO] Contrôleur physique créé avec succès")
                asyncio.run(main_async(node))
            except Exception as e:
                print(f"[ERROR] Erreur lors de l'initialisation du contrôleur physique: {str(e)}")
                raise
    except Exception as e:
        print(f"[ERROR] Erreur fatale: {str(e)}")
        raise
    finally:
        if 'node' in locals():
            try:
                node.destroy_node()
            except Exception as e:
                print(f"[ERROR] Erreur lors de la destruction du nœud: {str(e)}")
        rclpy.shutdown()

async def main_async(node):
    from gi.repository import GLib
    # Gestion du SIGINT (Ctrl+C)
    signal.signal(signal.SIGINT, signal.default_int_handler)
    
    # Création de la boucle principale GTK
    main_loop = GLib.MainLoop()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

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