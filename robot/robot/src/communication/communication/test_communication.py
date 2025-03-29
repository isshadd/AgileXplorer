import unittest
from unittest.mock import patch, MagicMock
import json
from std_msgs.msg import String
from nav_msgs.msg import Odometry
from geometry_msgs.msg import Point, Pose, PoseWithCovariance
from communication import CommunicationController

class TestCommunicationController(unittest.TestCase):
    def setUp(self):
        """Configuration initiale pour chaque test"""
        with patch('rclpy.node.Node.__init__') as mock_init:
            self.controller = CommunicationController()
            self.controller.get_logger = MagicMock()
            self.controller.movement_publisher = MagicMock()
            self.controller.position_publisher = MagicMock()

    def test_initialization(self):
        """Teste l'initialisation du contrôleur de communication"""
        self.assertIsNotNone(self.controller)
        self.assertIsInstance(self.controller, CommunicationController)
        self.assertEqual(self.controller.robot_id, 'limo1')  # Valeur par défaut

    def test_messages_callback(self):
        """Teste le traitement des messages de commande"""
        # Création d'un message de test
        test_msg = String()
        test_msg.data = json.dumps({"command": "avancer", "vitesse": 1.0})
        
        # Appel du callback
        self.controller.messages_callback(test_msg)
        
        # Vérification que le message a été publié
        self.controller.movement_publisher.publish.assert_called_once_with(test_msg)

    def test_odom_callback(self):
        """Teste le traitement des données d'odométrie"""
        # Création d'un message d'odométrie de test
        test_odom = Odometry()
        pose = PoseWithCovariance()
        pose.pose = Pose()
        pose.pose.position = Point()
        pose.pose.position.x = 1.0
        pose.pose.position.y = 2.0
        test_odom.pose = pose

        # Appel du callback
        self.controller.odom_callback(test_odom)

        # Vérification que les données ont été publiées
        self.controller.position_publisher.publish.assert_called_once()
        
        # Vérification du contenu du message publié
        published_msg = self.controller.position_publisher.publish.call_args[0][0]
        published_data = json.loads(published_msg.data)
        
        self.assertEqual(published_data["robot_id"], "limo1")
        self.assertEqual(published_data["odom"]["position"]["x"], 1.0)
        self.assertEqual(published_data["odom"]["position"]["y"], 2.0)

    def test_messages_callback_invalid_json(self):
        """Teste le traitement d'un message JSON invalide"""
        test_msg = String()
        test_msg.data = "données invalides"
        
        self.controller.messages_callback(test_msg)
        self.controller.get_logger().error.assert_called()

if __name__ == '__main__':
    unittest.main()