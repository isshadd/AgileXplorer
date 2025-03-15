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
  MissionLogMessage,
  ErrorMessage,
  RobotPosition,
} from '../interfaces/websocket.interface';
import { LogsService } from '../logs/logs.service';
import { WebSocketEvent } from '../interfaces/websocket.interface';
import { Logger, OnModuleDestroy, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

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
  private readonly logger = new Logger(RobotGateway.name);
  private activeConnections = new Set<Socket>();
  private sensorDataInterval: NodeJS.Timeout;
  private currentMissionId: string | null = null;

  private connectedClients: Set<Socket> = new Set();
  private reconnectionAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECTION_ATTEMPTS = 5;
  private robotPositions: Map<string, RobotPosition[]> = new Map();
  private readonly logger = new Logger(RobotGateway.name);
  private feedbackNode: rclnodejs.Node;
  constructor(
    private readonly missionService: MissionService,
    private readonly logsService: LogsService,
  ) {}

    this.initROS2();
  @SubscribeMessage('startMission')
  handleStartMission() {
    const result = this.missionService.startMission();
    this.currentMissionId = result.missionId;
    this.startSensorDataLogging();
    this.server.emit('missionStarted', result);
    return result;
  }

  private async initROS2() {
    try {
      this.feedbackNode = rclnodejs.createNode('robot_feedback_node');
      this.feedbackNode.createSubscription(
        'nav_msgs/msg/Odometry',
        '/102robot1/odom', // Topic avec l'ID du robot défini dans limo_base.launch.py
        (msg: any) => {
          this.logger.debug("Message d'odométrie reçu");
          try {
            // Extraire les données de position du message d'odométrie
            const position = {
              x: msg.pose.pose.position.x,
              y: msg.pose.pose.position.y,
              timestamp: Date.now(),
            };

            // Pour l'instant on utilise un ID fixe car l'odométrie ne contient pas l'ID du robot
            // TODO: Adapter selon votre logique d'identification des robots
            const robotId = 'robot1_102';

            this.handleRobotPosition(robotId, position);
            this.logger.debug(
              `Position reçue pour ${robotId}: ${JSON.stringify(position)}`,
            );
          } catch (error) {
            this.logger.error(
              'Erreur lors du traitement du message feedback:',
              error,
            );
          }
        },
      );
  @SubscribeMessage('stopMission')
  async handleStopMission(client: Socket) {
    try {
      // Stop sensor logging first to prevent new logs during shutdown
      this.stopSensorDataLogging();
      
      // Clear mission ID to prevent any new logs
      this.currentMissionId = null;
      
      // Stop the mission and finalize logs
      const result = await this.missionService.stopMission();
      
      // Notify all clients
      this.server.emit('missionStopped', result);
      
      return {
        event: 'stopMission',
        data: {
          success: true,
          ...result
        }
      };
    } catch (error) {
      this.logger.error('Error stopping mission:', error);
      return {
        event: 'error',
        data: {
          success: false,
          message: 'Failed to stop mission',
          error: error.message
        }
      };
    }
  }

      rclnodejs.spin(this.feedbackNode);
      this.logger.log(
        'Subscriber ROS2 initialisé pour le topic /102robot1/odom',
      );
    } catch (error) {
      this.logger.error("Erreur lors de l'initialisation de ROS2:", error);
    }
  }
  @SubscribeMessage('requestMissionLogs')
  async handleRequestMissionLogs(client: Socket, missionId: string) {
    try {
      const missionLog = await this.logsService.findMissionLog(missionId);
      client.emit('missionLogs', missionLog.logs);
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch mission logs' });
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  private async logSensorData() {
    if (!this.currentMissionId) return;

  ngOnDestroy() {
    if (this.feedbackNode) {
      this.feedbackNode.destroy();
      this.logger.log('Noeud ROS2 de feedback détruit');
    }
  }
    try {
      // Get sensor data for each robot and log it
      const robotIds = ['limo1', 'limo2'];
      for (const robotId of robotIds) {
        await this.logsService.addLog(this.currentMissionId, {
          type: 'SENSOR',
          robotId: robotId,
          data: {
            position: {x:0, y:0, z:0},
            distance: 0,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      this.logger.error('Error logging sensor data:', error);
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.connectedClients.add(client);
    this.reconnectionAttempts.set(client.id, 0);
  async logCommand(robotId: string, command: string) {
    if (!this.currentMissionId) return;

    // Envoyer l'état initial des robots et leurs positions au nouveau client
    this.sendRobotStates(client);
    this.sendStoredPositions(client);
  }
    try {
      await this.logsService.addLog(this.currentMissionId, {
        type: 'COMMAND',
        robotId,
        data: {
          command,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Error logging command:', error);
    }
  }

  private startSensorDataLogging() {
    if (this.sensorDataInterval) {
      clearInterval(this.sensorDataInterval);
    }
    this.sensorDataInterval = setInterval(() => this.logSensorData(), 1000);
  }
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client);

  private stopSensorDataLogging() {
    if (this.sensorDataInterval) {
      clearInterval(this.sensorDataInterval);
      this.sensorDataInterval = null;
    }
  }

  emitMissionUpdate(data: any) {
    this.server.emit('missionUpdate', data);
  }

  onModuleDestroy() {
    if (this.sensorDataInterval) {
      clearInterval(this.sensorDataInterval);
    }
    this.activeConnections.clear();
  }
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
