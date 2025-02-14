# Guide d'Intégration Frontend-Serveur

## 1. Communication WebSocket

### 1.1 Configuration du Serveur
```typescript
// src/websocket/gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200'
  }
})
export class RobotGateway {
  @WebSocketServer()
  server: Server;

  // Événements écoutés
  @SubscribeMessage('mission_command')
  handleCommand(client: Socket, payload: MissionCommandDto) {
    // Logique de traitement
  }
}
```

### 1.2 Événements Frontend
| Événement | Direction | Format | Description |
|-----------|-----------|--------|-------------|
| robot_status | Serveur → Frontend | `{id: string, battery: number, position: {x,y}, mode: string}` | Mise à jour état robot (1Hz) |
| mission_command | Frontend → Serveur | `{type: 'START'|'STOP'|'RETURN', robots: string[]}` | Commandes de mission |
| p2p_update | Serveur → Frontend | `{source: string, target: string, distance: number}` | Notification P2P |

## 2. API REST Critique

### 2.1 Endpoints Clés
```typescript
// src/mission/mission.controller.ts
@Controller('missions')
export class MissionController {
  
  @Get()
  getMissions(@Query() filters: MissionFilterDto) {
    // Récupération historique avec filtres
  }

  @Post(':id/map')
  @HttpCode(204)
  async saveMap(@Param('id') missionId: string, @Body() mapData: MapDto) {
    // Sauvegarde carte
  }
}
```

### 2.2 DTOs Importants
```typescript
// src/mission/dto/mission-filter.dto.ts
export class MissionFilterDto {
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsIn(['ongoing', 'completed', 'aborted'])
  status?: string;
}
```

## 3. Intégration ROS2

### 3.1 Topics Essentiels
```typescript
// src/ros/ros.service.ts
interface RosConfig {
  topics: {
    status: string;
    cmd: string;
    p2p: string;
  };
}

const config: RosConfig = {
  topics: {
    status: '/robot/{id}/status',
    cmd: '/mission/cmd',
    p2p: '/robots/p2p'
  }
};
```

### 3.2 Workflow Typique
```mermaid
sequenceDiagram
    Frontend->>Serveur: WS: mission_command
    Serveur->>ROS2: Publie sur /mission/cmd
    ROS2->>Robot: Exécute commande
    Robot->>ROS2: /robot/{id}/status
    ROS2->>Serveur: Transmet status
    Serveur->>Frontend: WS: robot_status
    Serveur->>Database: Sauvegarde métriques
```

## 4. Variables d'Environnement
```ini
# .env.example
ROS_DOMAIN_ID=27
WS_PORT=8080
DB_URL=postgres://user:pass@postgres:5432/robot_db
FRONTEND_URL=http://localhost:4200
```

## 5. Modèles de Données

### 5.1 Mission
```typescript
interface Mission {
  id: string;
  startTime: Date;
  endTime?: Date;
  robots: string[];
  map?: {
    format: 'base64'|'geojson';
    data: string;
  };
  logs: LogEntry[];
}
```

### 5.2 Robot
```typescript
interface RobotStatus {
  id: string;
  position: {
    x: number;
    y: number;
    theta?: number;
  };
  battery: number;
  mode: 'ackerman'|'differential';
}
```

## 6. Sécurité
```typescript
// src/auth/api-key.guard.ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.headers['x-api-key'] === process.env.API_KEY;
  }
}
```

## 7. Déploiement Docker
```dockerfile
# Dockerfile.prod
FROM node:18-slim
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
COPY . .
CMD ["npm", "run", "start:prod"]
```

## 8. Checklist d'Implémentation
- [ ] Configuration WebSocket avec CORS
- [ ] Handler pour les commandes de mission
- [ ] Intégration ROS2 avec rclnodejs
- [ ] Tests E2E des endpoints critiques
- [ ] Middleware de validation des DTOs
- [ ] Scripts de migration de base de données

## 9. Notes Techniques
1. **Latence Critique** : Garder <200ms entre commande frontend et exécution robot
2. **QoS ROS2** : Utiliser ReliabilityPolicy.RELIABLE pour les commandes
3. **Buffer Cartographique** : Limiter à 10MB par mission
4. **Fallback P2P** : Si ROS2 indisponible, utiliser UDP direct