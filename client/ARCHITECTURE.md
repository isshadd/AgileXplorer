# Architecture du Système Multi-Robot

```mermaid
graph TD
    A[Frontend Angular] --> B[WebSocket]
    B --> C[NestJS Server]
    C --> D[ROS2 Bridge]
    D --> E[(PostgreSQL)]
    C --> F[Robot Service]
    D --> G[Gazebo Simulation]
    F --> H[Robot LIMO 1]
    F --> I[Robot LIMO 2]
    H --> J[P2P Communication]
    I --> J
```

## 1. Architecture Client-Serveur

### 1.1 Frontend Angular
```mermaid
flowchart LR
    subgraph Frontend
        A[Dashboard] --> B[Map Component]
        A --> C[Robot Status]
        A --> D[Mission Control]
        E[Mission History] --> F[Filterable List]
        E --> G[Map Replay]
        H[Configuration] --> I[Wheel Mode Selector]
    end
```

**Fonctionnalités Clés :**
- Visualisation temps réel avec WebSocket (1Hz minimum)
- Gestion des missions (start/stop/return)
- Historique avec filtrage (R.F.17)
- Affichage cartes sauvegardées (R.F.18)
- Sélection mode roues (R.F.15)

### 1.2 Serveur NestJS
```mermaid
sequenceDiagram
    Frontend->>+Serveur: WS: start_mission
    Serveur->>+ROS2: publish /mission_cmd
    ROS2-->>-Serveur: confirmation
    Serveur-->>-Frontend: status_update
    loop 1Hz
        ROS2->>Serveur: robot_status
        Serveur->>Frontend: status_update
        Serveur->>Database: save_metrics
    end
```

**Composants Serveur :**
- WebSocket Gateway
- ROS2 Bridge Service (rclnodejs)
- Mission Service
- Database Module (TypeORM)

## 2. Intégration ROS2

### 2.1 Communication Robot-Serveur
```mermaid
graph LR
    subgraph ROS2 Network
        A[Robot LIMO 1] -->|/robot1/status| B[ROS2 Master]
        C[Robot LIMO 2] -->|/robot2/status| B
        B -->|/mission_cmd| A
        B -->|/mission_cmd| C
        A -->|P2P Topic| C
    end
```

**Topics Clés :**
- `/robot*/status` : Position, batterie, mode
- `/mission_cmd` : Commandes haut niveau
- `/p2p_communication` : Échange direct robot-robot (R.F.19)

## 3. Déploiement Docker

```mermaid
graph TD
    A[docker-compose.yml] --> B[frontend:80]
    A --> C[backend:3000]
    A --> D[postgres:5432]
    A --> E[ros2-bridge]
    E --> F[Gazebo]
```

**Configuration Type :**
```yaml
services:
  frontend:
    build: ./client
    ports: ["80:80"]
    
  backend:
    build: ./server
    environment:
      ROS_DOMAIN_ID: 27
    depends_on: [postgres]

  postgres:
    image: postgres:15
    volumes: [postgres_data:/var/lib/postgresql/data]

  ros2-bridge:
    image: ros:humble
    command: ros2 launch exploration_bringup robot.launch.py
```

## 4. Conformité aux Exigences

| Exigence | Composant | Implémentation |
|----------|-----------|----------------|
| R.F.15 | Frontend | Sélecteur mode roues → Service ROS2 |
| R.F.17 | Serveur | PostgreSQL + TypeORM |
| R.F.18 | Frontend | Leaflet.js + historique missions |
| R.F.19 | ROS2 | Topic P2P dédié |
| R.C.2 | DevOps | docker-compose unique |
| R.Q.1 | Global | ESLint + Prettier config |

## 5. Workflow de Développement

```mermaid
gantt
    title Feuille de Route Frontend
    dateFormat  YYYY-MM-DD
    section Angular
    Dashboard Component       :done, des1, 2025-02-01, 7d
    Service WebSocket         :active, des2, 2025-02-08, 5d
    Mission History           :         des3, after des2, 7d
    section NestJS
    ROS2 Bridge Service       :done, 2025-02-01, 10d
    Database Integration      :active, 2025-02-10, 7d
    P2P Handling              :         des4, after des3, 5d
```

**Prochaines Étapes :**
1. Finaliser l'intégration WebSocket
2. Implémenter le replay de carte historique
3. Tester la communication P2P entre robots