import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
  RobotPosition,
} from '../interfaces/websocket.interface';

interface StartPositionMessage {
  type: 'SET_START_POSITION';
  payload: {
    robotId: string;
    position: RobotPosition;
  };
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200',
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

  constructor(private readonly missionService: MissionService) {
    this.initROS2();
  }

  private async initROS2() {
    try {
      this.feedbackNode = rclnodejs.createNode('robot_feedback_node');
      this.feedbackNode.createSubscription(
        'std_msgs/msg/String',
        '/server_feedback',
        (msg: any) => {
          try {
            const data = JSON.parse(msg.data);
            if (data.robot_id && data.position) {
              this.handleRobotPosition(data.robot_id, data.position);
            }
          } catch (error) {
            this.logger.error('Erreur lors du traitement des données:', error);
          }
        },
      );
      rclnodejs.spin(this.feedbackNode);
    } catch (error) {
      this.logger.error("Erreur lors de l'initialisation de ROS2:", error);
    }
  }

  ngOnDestroy() {
    if (this.feedbackNode) {
      this.feedbackNode.destroy();
    }
  }

  @SubscribeMessage('set_start_position')
  handleSetStartPosition(client: Socket, message: StartPositionMessage) {
    try {
      const { robotId, position } = message.payload;
      this.robotPositions.set(robotId, [position]);
      const positionMessage: RobotPositionMessage = {
        type: 'ROBOT_POSITION',
        payload: {
          robotId,
          position,
          speed: 0,
          angular: 0,
          battery: 100,
        },
      };
      this.server.emit('ROBOT_POSITION', positionMessage);
    } catch (error) {
      this.emitError(client, {
        message: 'Erreur lors de la définition de la position de départ',
        code: 'START_POSITION_ERROR',
      });
    }
  }

  handleConnection(client: Socket) {
    this.connectedClients.add(client);
    this.reconnectionAttempts.set(client.id, 0);
    this.sendRobotStates(client);
    this.sendStoredPositions(client);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client);
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

  private handleReconnectionTimeout(client: Socket) {
    const attempts = this.reconnectionAttempts.get(client.id) || 0;
    if (attempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      this.broadcastError({
        message: `Client ${client.id} connection lost`,
        code: 'CONNECTION_LOST',
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
    this.robotPositions.get(robotId)!.push(position);

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

  private emitError(client: Socket, error: ErrorMessage['payload']) {
    const message: ErrorMessage = {
      type: 'error',
      payload: error,
    };
    client.emit('error', message);
  }

  private broadcastError(error: ErrorMessage['payload']) {
    const message: ErrorMessage = {
      type: 'error',
      payload: error,
    };
    this.server.emit('error', message);
  }
}
