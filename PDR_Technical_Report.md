# INF3995 Projet de conception - Rapport PDR  
**Équipe 102**  
*Amine Zerouali, Kevin Santiago Gratton Fournier, Issam Haddadi, Rafik Hachemi Boumila, Yassine Mohamed Taha Abassi, Mario Junior Milord*  
*13 février 2025*

## 1. Vue d'ensemble du projet
### 1.1 Architecture globale
```mermaid
graph TD
    %% Station Sol
    subgraph "Station Sol"
      A[Interface Web Angular] -->|WebSocket| B[API NestJS - Station au sol]
      B --> C[PostgreSQL]
      B -->|Bridge ROS-Gazebo| E[Simulation]
    end

    %% Réseau ROS2
    subgraph "ROS2 Network"
      D[Robot Limo 1] <-->|P2P| F[Robot Limo 2]
    end

    %% Connexions entre la station et les robots
    B <-->|ROS2 Topics| D
    B <-->|ROS2 Topics| F
```

### 1.2 Stack technique
| Composant | Technologies | 
|-----------|--------------|
| Frontend | Angular 16, TypeScript, Leaflet |
| Backend | NestJS, WebSocket (désactivé), ROS2 Humble |
| Robots | ROS2 Humble, Python 3.10, Limo SDK |
| Simulation | Gazebo Fortress, ros_gz_bridge |

## 2. Architecture logicielle
### 2.1 Structure ROS2
**Package Control** (`robot/control`):
```xml
<!-- package.xml -->
<depend>rclpy</depend>
<depend>geometry_msgs</depend>
```

**Topics clés**:
```python
# communication.py
self.create_publisher(String, f'/{self.robot_id}/movement', 10)
self.create_subscription(String, f'/{self.robot_id}/messages', callback, 10)
```

### 2.2 Messages personnalisés
**LimoStatus.msg**:
```ros
# robot/limo/src/limo_ros2/limo_msgs/msg/LimoStatus.msg
std_msgs/Header header
uint8 vehicle_state
uint8 control_mode
float64 battery_voltage
uint16 error_code
uint8 motion_mode
```

## 3. Intégration simulation
### 3.1 Lancement Gazebo
```python
# diff_drive.launch.py
LaunchDescription([
    IncludeLaunchDescription(gz_sim.launch.py),
    Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        parameters=[{
            '/cmd_vel@geometry_msgs/msg/Twist@gz.msgs.Twist'
        }]
    )
])
```

### 3.2 Performances actuelles
| Métrique | Valeur | Cible |
|----------|--------|-------|
| Latence ROS-Gazebo | 150ms | <200ms |
| Précision position | ±2.3cm | <5cm |
| CPU Simulation | 38% | <70% |

## 4. Validation technique
### 4.1 État des requis
- ✅ R.F.1: Identification robot
- ✅ R.F.2: Commandes START/STOP
- ⚠️ R.F.8: Cartographie 2D (Partiel)
- ❌ R.F.19: Communication P2P (En développement)

### 4.2 Prochaines étapes
1. Activer WebSocket (15h)
2. Implémenter le P2P ROS2 (20h)
3. Finaliser l'intégration cartographique (25h)

**Budget consommé**: 420h/630h  
**Risque principal**: Fonctionnalité WebSocket désactivée - Impact sur communication temps réel

### 4.3 Tests en cours
```gherkin
Scenario: Démarrage mission
    Given Un robot connecté
    When Envoi commande "START_MISSION"
    Then Réponse en <200ms
    And Batterie >30%
