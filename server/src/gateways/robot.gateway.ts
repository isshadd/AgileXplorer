import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { MissionService } from '../mission/mission.service';
import {
  MissionCommandMessage,
  WheelModeMessage,
  RobotStatesMessage,
  RobotPositionMessage,
  MissionLogMessage,
  ErrorMessage,
  RobotPosition,
} from '../interfaces/websocket.interface';

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

  private testInterval: NodeJS.Timeout;

  constructor(private readonly missionService: MissionService) {
    // this.startWebSocketTest();
  }

  // private startWebSocketTest() {
  //   console.log('Démarrage du test WebSocket...');
  //   let x = 0;
  //   let y = 0;

  //   this.testInterval = setInterval(() => {
  //     // Simuler un mouvement en cercle
  //     x = 2 * Math.cos(Date.now() / 1000);
  //     y = 2 * Math.sin(Date.now() / 1000);

  //     const testPosition: RobotPosition = {
  //       x,
  //       y,
  //       timestamp: Date.now() / 1000
  //     };

  //     this.handleRobotPosition('robot1_102', testPosition);
  //     console.log('Position test envoyée:', testPosition);
  //   }, 1000); // Envoyer une nouvelle position chaque seconde
  // }

  ngOnDestroy() {
    if (this.testInterval) {
      clearInterval(this.testInterval);
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.connectedClients.add(client);
    this.reconnectionAttempts.set(client.id, 0);

    // Envoyer l'état initial des robots et leurs positions au nouveau client
    this.sendRobotStates(client);
    this.sendStoredPositions(client);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
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
      console.warn(`Client ${client.id} exceeded max reconnection attempts`);
      this.reconnectionAttempts.delete(client.id);
    }
  }

  private handleReconnectionTimeout(client: Socket) {
    const attempts = this.reconnectionAttempts.get(client.id) || 0;
    if (attempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      console.error(
        `Client ${client.id} failed to reconnect after ${attempts} attempts`,
      );
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
      console.error('Error handling mission command:', error);
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
      console.error('Error setting wheel mode:', error);
      this.emitError(client, {
        message: error.message,
        code: 'WHEEL_MODE_ERROR',
      });
    }
  }

  public broadcastRobotStates(states: any[]) {
    const message: RobotStatesMessage = {
      type: 'ROBOT_STATES',
      payload: { states },
    };
    this.server.emit('ROBOT_STATES', message);
  }

  public handleRobotPosition(robotId: string, position: RobotPosition) {
    // Stocker la position
    if (!this.robotPositions.has(robotId)) {
      this.robotPositions.set(robotId, []);
    }
    this.robotPositions.get(robotId).push(position);

    // Garder seulement les 1000 dernières positions pour chaque robot
    const positions = this.robotPositions.get(robotId);
    if (positions.length > 1000) {
      positions.shift();
    }

    // Diffuser la nouvelle position
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
      console.error('Error sending robot states:', error);
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

  public broadcastMissionLog(log: MissionLogMessage['payload']['log']) {
    const message: MissionLogMessage = {
      type: 'MISSION_LOG',
      payload: { log },
    };
    this.server.emit('MISSION_LOG', message);
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
