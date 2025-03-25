import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { MissionService } from '../mission/mission.service';
import * as rclnodejs from 'rclnodejs';
import {
  MissionCommandMessage,
  WheelModeMessage,
  RobotStatesMessage,
  RobotPositionMessage,
  ErrorMessage,
  InitialPositionMessage,
  RobotPosition,
  ErrorPayload,
  MapDataMessage,
  MapDataPayload,
} from '../interfaces/websocket.interface';
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // Permet les connexions depuis n'importe quelle origine
    credentials: true,
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
  },
})
export class RobotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Set<Socket> = new Set();
  private reconnectionAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECTION_ATTEMPTS = 5;
  private robotPositions: Map<string, RobotPosition[]> = new Map();
  private readonly logger = new Logger(RobotGateway.name);
  private feedbackNode: rclnodejs.Node;
  private controllerClientId: string | null = null; // ID du client ayant le contrôle

  constructor(private readonly missionService: MissionService) {
    this.initROS2();
  }

  private async initROS2() {
    try {
      this.feedbackNode = rclnodejs.createNode('robot_feedback_node');
      
      // Abonnement aux données d'odométrie
      this.feedbackNode.createSubscription(
        'std_msgs/msg/String',
        '/robot_odom',
        (msg: any) => {
          try {
            const data = JSON.parse(msg.data);
            if (data.robot_id && data.odom) {
              const position: RobotPosition = {
                x: data.odom.position.x,
                y: data.odom.position.y,
                timestamp: data.odom.timestamp,
              };
              this.handleRobotPosition(data.robot_id, position);
            }
          } catch (error) {
            this.logger.error(
              "Erreur lors du traitement des données d'odométrie:",
              error,
            );
          }
        },
      );
      
      // Abonnement aux données de la carte (lidar)
      this.feedbackNode.createSubscription(
        'nav_msgs/msg/OccupancyGrid',
        '/map',
        (msg: any) => {
          try {
            // Conversion des données de carte pour le WebSocket
            const mapData: MapDataPayload = {
              resolution: msg.info.resolution,
              width: msg.info.width,
              height: msg.info.height,
              origin: {
                x: msg.info.origin.position.x,
                y: msg.info.origin.position.y,
                z: msg.info.origin.position.z,
                orientation: {
                  x: msg.info.origin.orientation.x,
                  y: msg.info.origin.orientation.y,
                  z: msg.info.origin.orientation.z,
                  w: msg.info.origin.orientation.w
                }
              },
              data: Array.from(msg.data)  // Conversion en Array JavaScript
            };
            
            this.emitMapData(mapData);
            this.logger.log("Données de carte reçues et transmises");
          } catch (error) {
            this.logger.error(
              "Erreur lors du traitement des données de carte:",
              error,
            );
          }
        },
      );

      rclnodejs.spin(this.feedbackNode);
    } catch (error) {
      this.logger.error("Erreur lors de l'initialisation de ROS2:", error);
    }
  }
  
  // Méthode pour émettre les données de la carte
  private emitMapData(mapData: MapDataPayload) {
    const message: MapDataMessage = {
      type: 'MAP_DATA',
      payload: mapData
    };
    this.server.emit('MAP_DATA', message);
  }

  ngOnDestroy() {
    if (this.feedbackNode) {
      this.feedbackNode.destroy();
    }
  }

  handleConnection(client: Socket) {
    this.connectedClients.add(client);
    this.reconnectionAttempts.set(client.id, 0);
    this.sendRobotStates(client);
    this.sendStoredPositions(client);
    
    // Si c'est le seul client ou s'il n'y a pas de contrôleur, lui donner le contrôle
    if (this.connectedClients.size === 1 || !this.controllerClientId) {
      this.controllerClientId = client.id;
      this.sendControllerStatus(client, true);
    } else {
      // Sinon, mode spectateur
      this.sendControllerStatus(client, false);
    }
    
    // Informer tous les clients du nouveau nombre de clients connectés
    this.broadcastClientCount();
    this.logger.log(`Client ${client.id} connecté. Nombre total: ${this.connectedClients.size}. Contrôleur: ${this.controllerClientId}`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client);
    
    // Si le client qui se déconnecte était le contrôleur
    if (this.controllerClientId === client.id) {
      if (this.connectedClients.size > 0) {
        // S'il y a d'autres clients, donner le contrôle au premier
        this.controllerClientId = [...this.connectedClients][0].id;
        const newController = [...this.connectedClients].find(c => c.id === this.controllerClientId);
        if (newController) {
          this.sendControllerStatus(newController, true);
        }
      } else {
        // S'il n'y a plus de clients, réinitialiser le controllerClientId
        this.controllerClientId = null;
      }
    }
    
    // Mettre à jour le nombre de clients connectés
    this.broadcastClientCount();
    
    const attempts = this.reconnectionAttempts.get(client.id) || 0;
    if (attempts < this.MAX_RECONNECTION_ATTEMPTS) {
      this.reconnectionAttempts.set(client.id, attempts + 1);
      setTimeout(() => {
        if (!this.connectedClients.has(client)) {
          this.handleReconnectionTimeout(client);
        }
      }, 3000);
    } else {
      this.reconnectionAttempts.delete(client.id);
    }
  }
  
  private sendControllerStatus(client: Socket, isController: boolean) {
    client.emit('CONTROLLER_STATUS', { isController });
  }
  
  private broadcastClientCount() {
    this.server.emit('CLIENT_COUNT', { count: this.connectedClients.size });
    this.logger.log(`Nombre de clients connectés: ${this.connectedClients.size}`);
  }

  private handleReconnectionTimeout(client: Socket) {
    const attempts = this.reconnectionAttempts.get(client.id) || 0;
    if (attempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      this.broadcastError({
        message: `Client ${client.id} connection lost`,
        code: 'CONNECTION_LOST',
      });
    }
  }

  @SubscribeMessage('set_initial_position')
  async handleSetInitialPosition(
    client: Socket,
    message: InitialPositionMessage,
  ) {
    try {
      const { robotId, position } = message.payload;
      // Mettre à jour la position du robot
      this.handleRobotPosition(robotId, {
        x: position.x,
        y: position.y,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.emitError(client, {
        message: error.message,
        code: 'SET_POSITION_ERROR',
      });
    }
  }

  @SubscribeMessage('mission_command')
  async handleMissionCommand(client: Socket, message: MissionCommandMessage) {
    try {
      switch (message.payload.type) {
        case 'START':
          for (const robotId of message.payload.robots) {
            await this.missionService.startMission(robotId);
          }
          break;
        case 'STOP':
          for (const robotId of message.payload.robots) {
            await this.missionService.stopMission(robotId);
          }
          break;
        case 'RETURN':
          for (const robotId of message.payload.robots) {
            await this.missionService.returnToBase(robotId);
          }
          break;
        default:
          throw new Error(`Unknown command type: ${message.payload.type}`);
      }
    } catch (error) {
      this.emitError(client, {
        message: error.message,
        code: 'MISSION_COMMAND_ERROR',
      });
    }
  }

  @SubscribeMessage('wheel_mode')
  async handleWheelMode(client: Socket, message: WheelModeMessage) {
    try {
      const { robotId, mode } = message.payload;
      await this.missionService.setWheelMode(robotId, mode);
    } catch (error) {
      this.emitError(client, {
        message: error.message,
        code: 'WHEEL_MODE_ERROR',
      });
    }
  }

  public handleRobotPosition(robotId: string, position: RobotPosition) {
    if (!this.robotPositions.has(robotId)) {
      this.robotPositions.set(robotId, []);
    }
    this.robotPositions.set(robotId, [position]); // Ne garder que la dernière position

    const message: RobotPositionMessage = {
      type: 'ROBOT_POSITION',
      payload: {
        robotId,
        position,
        speed: 0,
        angular: 0,
        battery: 100,
      },
    };
    this.server.emit('ROBOT_POSITION', message);
  }

  private async sendRobotStates(client: Socket) {
    try {
      const states = await this.missionService.getRobotStates();
      const message: RobotStatesMessage = {
        type: 'ROBOT_STATES',
        payload: { states },
      };
      client.emit('ROBOT_STATES', message);
    } catch (error) {
      this.emitError(client, {
        message: 'Failed to fetch robot states',
        code: 'ROBOT_STATES_ERROR',
      });
    }
  }

  private sendStoredPositions(client: Socket) {
    for (const [robotId, positions] of this.robotPositions.entries()) {
      positions.forEach((position) => {
        const message: RobotPositionMessage = {
          type: 'ROBOT_POSITION',
          payload: {
            robotId,
            position,
            speed: 0,
            angular: 0,
            battery: 100,
          },
        };
        client.emit('ROBOT_POSITION', message);
      });
    }
  }

  private emitError(client: Socket, error: ErrorPayload) {
    const message: ErrorMessage = {
      type: 'error',
      payload: error,
    };
    client.emit('error', message);
  }

  private broadcastError(error: ErrorPayload) {
    const message: ErrorMessage = {
      type: 'error',
      payload: error,
    };
    this.server.emit('error', message);
  }
  @SubscribeMessage('GET_CLIENT_COUNT')
  handleGetClientCount(@ConnectedSocket() client: Socket) {
    // Envoyer seulement au client qui demande
    client.emit('CLIENT_COUNT', { count: this.connectedClients.size });
    client.emit('CONTROLLER_STATUS', { isController: client.id === this.controllerClientId });
    
    this.logger.log(`Client ${client.id} a demandé le nombre de clients connectés: ${this.connectedClients.size}`);
    return { success: true };
  }

}
