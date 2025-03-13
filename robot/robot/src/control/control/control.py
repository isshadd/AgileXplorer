import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from std_msgs.msg import String
import json

class MoveController(Node):

    def __init__(self):
        super().__init__('move_controller')
        self.declare_parameter('robot_id', 'robot1_102')
        self.robot_id = self.get_parameter('robot_id').value

        movement_topic = f'/{self.robot_id}/movement'
        self.movement_subscription = self.create_subscription(
            String,
            movement_topic,
            self.movement_callback,
            10
        )

        cmd_vel_topic = f'/{self.robot_id}/cmd_vel'
        self.publisher = self.create_publisher(Twist, cmd_vel_topic, 10)

        self.feedback_publisher = self.create_publisher(String, '/feedback', 10)
        self.feedback_timer = self.create_timer(1.0, self.publish_feedback)

        self.current_action = None
        self.action_start_time = None
        self.mission_active = False
        self.action_duration = 0
        self.current_speed = 0.0
        self.current_angular = 0.0
        self.current_position = {"x": 0.0, "y": 0.0}
        self.battery_level = 100

    def movement_callback(self, msg):
        try:
            command = json.loads(msg.data)
            self.get_logger().info(f"Commande reçue sur {self.robot_id}: {command}")

            if command['action'] == 'move':
                self._cancel_current_action()
                self.current_speed = command.get('speed', 0.0)
                self.current_angular = 0.0
                self.action_duration = command.get('duration', 0.0)
                self.start_action_timer()
            elif command['action'] == 'turn':
                self._cancel_current_action()
                self.current_speed = 0.0
                self.current_angular = command.get('speed', 0.0)
                self.action_duration = command.get('duration', 0.0)
                self.start_action_timer()
            elif command['action'] == 'start_mission':
                self._cancel_current_action()
                self.current_speed = 0.1
                self.current_angular = 0.2
                self.action_duration = 3000
                self.start_action_timer()
            elif command['action'] == 'end_mission':
                self.mission_active = False
                self.stop()
            elif command['action'] == 'stop':
                self.stop()
            else:
                self.get_logger().warn(f"Commande inconnue: {command['action']}")
        except Exception as e:
            self.get_logger().error(f"Erreur dans le traitement de la commande: {str(e)}")

    def _mission_turn_loop(self):
        if self.mission_active:
            twist = Twist()
            twist.linear.x = 0.0
            twist.angular.z = 1.0
            self.publisher.publish(twist)

    def start_action_timer(self):
        self.action_start_time = self.get_clock().now()
        self.timer = self.create_timer(0.1, self._execute_action)

    def _execute_action(self):
        elapsed = (self.get_clock().now() - self.action_start_time).nanoseconds / 1e9
        if elapsed < self.action_duration:
            twist = Twist()
            twist.linear.x = self.current_speed
            twist.angular.z = self.current_angular
            self.publisher.publish(twist)
        else:
            self.stop()
            self.timer.cancel()

    def _cancel_current_action(self):
        if hasattr(self, 'timer') and not self.timer.is_canceled():
            self.timer.cancel()
        self.stop()

    def stop(self):
        twist = Twist()
        self.publisher.publish(twist)
        self.current_speed = 0.0
        self.current_angular = 0.0

    def publish_feedback(self):
        dt = 1.0
        # Calcul de la nouvelle position en tenant compte de la rotation
        self.current_position["x"] += self.current_speed * dt * (1 if abs(self.current_angular) < 0.1 else 0)
        self.current_position["y"] += self.current_speed * dt * (1 if abs(self.current_angular) >= 0.1 else 0)
        
        feedback = {
            "speed": self.current_speed,
            "angular": self.current_angular,
            "position": self.current_position,
            "battery": self.battery_level,
            "robot_id": self.robot_id,
            "timestamp": self.get_clock().now().nanoseconds / 1e9
        }
        new_feedback_str = json.dumps(feedback)
        if not hasattr(self, 'last_feedback'):
            self.last_feedback = ""
        if new_feedback_str != self.last_feedback:
            feedback_msg = String()
            feedback_msg.data = new_feedback_str
            self.feedback_publisher.publish(feedback_msg)
            self.get_logger().info(f"Feedback publié: {feedback_msg.data}")
            self.last_feedback = new_feedback_str
        else:
            self.get_logger().debug("Feedback inchangé, non publié.")

def main(args=None):
    rclpy.init(args=args)
    node = MoveController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
