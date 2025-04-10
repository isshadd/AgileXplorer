/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
  LimoStatusPayload,
  WebSocketMessage,
} from '../interfaces/websocket.interface';
import { LogsService } from '../logs/logs.service';
import { WebSocketEvent } from '../interfaces/websocket.interface';
import { Logger, OnModuleDestroy, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

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
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RobotGateway.name);
  private activeConnections = new Set<Socket>();
  private sensorDataInterval: NodeJS.Timeout;
  private currentMissionId: string | null = null;

  private connectedClients: Set<Socket> = new Set();
  private reconnectionAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECTION_ATTEMPTS = 5;
  private robotPositions: Map<string, RobotPosition[]> = new Map();
  private feedbackNode: rclnodejs.Node;
  private batteryInterval: NodeJS.Timeout;
  private robotBatteryLevels: Map<string, number> = new Map([
    ['limo1', 85],
    ['limo2', 100],
  ]);
  private controllerClientId: string | null = null; // ID du client ayant le contrôle

  private readonly SIMULATE_BATTERY = false;
  private readonly MIN_VOLTAGE = 9;
  private readonly MAX_VOLTAGE = 12.6;

  constructor(
    private readonly missionService: MissionService,
    private readonly logsService: LogsService,
  ) {
    this.initROS2();
    this.logsService.initialize(this.server);
    this.missionService.initialize(this.server);
    if (this.SIMULATE_BATTERY) {
      this.logger.log('Starting battery simulation mode');
      this.startBatterySimulation();
    }
  }

  @SubscribeMessage('startMission')
  async handleStartMission(@MessageBody() robotId: string) {
    try {
      const result = await this.missionService.startMission(robotId);
      this.currentMissionId = result.missionId;
      this.startSensorDataLogging();
      this.server.emit('missionStarted', result);

      // Get and emit initial mission logs
      const missionLog = await this.logsService.findMissionLog(result.missionId);
      this.server.emit('missionLogs', missionLog.logs);
      
      return result;
    } catch (error) {
      this.logger.error('Error starting mission:', error);
      throw error;
    }
  }

  private calculateBatteryPercentage(voltage: number): number {
    const percentage =
      ((voltage - this.MIN_VOLTAGE) / (this.MAX_VOLTAGE - this.MIN_VOLTAGE)) *
      100;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  private startBatterySimulation() {
    this.batteryInterval = setInterval(() => {
      for (const [robotId, level] of this.robotBatteryLevels.entries()) {
        // Simulate voltage between MIN_VOLTAGE and MAX_VOLTAGE
        const reduction = Math.random() * 0.1; // Small voltage drop
        const currentVoltage =
          this.MIN_VOLTAGE +
          ((this.MAX_VOLTAGE - this.MIN_VOLTAGE) * level) / 100;

        let newVoltage = Math.max(this.MIN_VOLTAGE, currentVoltage - reduction);
        if (newVoltage <= this.MIN_VOLTAGE + 0.5) {
          newVoltage = this.MAX_VOLTAGE; // Simulate battery replacement/recharge
        }

        const batteryLevel = this.calculateBatteryPercentage(newVoltage);
        this.robotBatteryLevels.set(robotId, batteryLevel);

        this.server.emit('BATTERY_DATA', {
          type: 'BATTERY_DATA',
          payload: {
            robotId,
            battery_level: batteryLevel,
          },
        });
      }
    }, 2000);
  }
  private async initROS2() {
    try {
      // Attendre l'initialisation de rclnodejs par MissionService
      await this.missionService.waitForInitialization();

      // Créer un noeud avec un identifiant unique
      const nodeId = Math.random().toString(36).substring(7);
      this.feedbackNode = rclnodejs.createNode(`robot_feedback_node_${nodeId}`);

      // Abonnement aux données de statut et de batterie
      this.feedbackNode.createSubscription(
        'limo_msgs/msg/LimoStatus' as any,
        '/limo1/limo_status',
        (rosMsg: any) => {
          // Transform ROS message to our interface format
          const msg: LimoStatusPayload = {
            robotId: 'limo1', // You might want to make this dynamic
            vehicle_state: rosMsg.vehicle_state,
            control_mode: rosMsg.control_mode,
            battery_voltage: rosMsg.battery_voltage,
            error_code: rosMsg.error_code,
            motion_mode: rosMsg.motion_mode,
          };

          const batteryLevel = this.calculateBatteryPercentage(
            msg.battery_voltage,
          );
          this.logger.log(
            `Received battery update - Robot: ${msg.robotId}, Battery Level: ${batteryLevel}V`,
          );

          this.server.emit('BATTERY_DATA', {
            type: 'BATTERY_DATA',
            payload: {
              robotId: msg.robotId,
              battery_level: batteryLevel,
            },
          });
        },
      );

      this.feedbackNode.createSubscription(
        'limo_msgs/msg/LimoStatus' as any,
        '/limo2/limo_status',
        (rosMsg: any) => {
          // Transform ROS message to our interface format
          const msg: LimoStatusPayload = {
            robotId: 'limo2', // You might want to make this dynamic
            vehicle_state: rosMsg.vehicle_state,
            control_mode: rosMsg.control_mode,
            battery_voltage: rosMsg.battery_voltage,
            error_code: rosMsg.error_code,
            motion_mode: rosMsg.motion_mode,
          };

          const batteryLevel = this.calculateBatteryPercentage(
            msg.battery_voltage,
          );
          this.logger.log(
            `Received battery update - Robot: ${msg.robotId}, Battery Level: ${batteryLevel}V`,
          );

          this.server.emit('BATTERY_DATA', {
            type: 'BATTERY_DATA',
            payload: {
              robotId: msg.robotId,
              battery_level: batteryLevel,
            },
          });
        },
      );

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
                  w: msg.info.origin.orientation.w,
                },
              },
              data: Array.from(msg.data), // Conversion en Array JavaScript
            };

            this.emitMapData(mapData);
            this.logger.log('Données de carte reçues et transmises');
          } catch (error) {
            this.logger.error(
              'Erreur lors du traitement des données de carte:',
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
  @SubscribeMessage('stopMission')
  async handleStopMission(client: Socket, robotId: string) {
    try {
      // Stop sensor logging first to prevent new logs during shutdown
      this.stopSensorDataLogging();

      // Clear mission ID to prevent any new logs
      this.currentMissionId = null;

      // Stop the mission and finalize logs
      const result = await this.missionService.stopMission(robotId);

      // Notify all clients
      this.server.emit('missionStopped', result);

      return {
        event: 'stopMission',
        data: {
          success: true,
          ...result,
        },
      };
    } catch (error) {
      this.logger.error('Error stopping mission:', error);
      return {
        event: 'error',
        data: {
          success: false,
          message: 'Failed to stop mission',
          error: error.message,
        },
      };
    }
  }

  // Méthode pour émettre les données de la carte
  private emitMapData(mapData: MapDataPayload) {
    const message: MapDataMessage = {
      type: 'MAP_DATA',
      payload: mapData,
    };
    this.server.emit('MAP_DATA', message);
  }
  @SubscribeMessage('requestMissionLogs')
  async handleRequestMissionLogs(client: Socket, message: WebSocketMessage<{ missionId: string }>) {
    try {
      if (!message?.payload?.missionId) {
        throw new Error('Missing missionId in request');
      }
      const missionLog = await this.logsService.findMissionLog(message.payload.missionId);
      client.emit('missionLogs', missionLog.logs);
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch mission logs' });
    }
  }

  ngOnDestroy() {
    if (this.feedbackNode) {
      this.feedbackNode.destroy();
    }
    if (this.batteryInterval) {
      clearInterval(this.batteryInterval);
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  private async logSensorData() {
    if (!this.currentMissionId) return;
    try {
      // Get sensor data for each robot and log it
      const robotIds = ['limo1', 'limo2'];
      const robotStates = await this.missionService.getRobotStates();
      
      for (const robotId of robotIds) {
        const robotState = robotStates[robotId];
        if (robotState) {
          const logEntry = {
            type: 'SENSOR' as const,
            robotId: robotId,
            data: {
              ...robotState,
              timestamp: new Date().toISOString(),
            },
          };
          await this.logsService.addLog(this.currentMissionId, logEntry);
          this.logger.verbose(`État du robot ${logEntry.robotId}: ${JSON.stringify(logEntry.data)}`);
          
          // Emit updated logs to all clients
          const missionLog = await this.logsService.findMissionLog(this.currentMissionId);
          this.server.emit('missionLogs', missionLog.logs);
        }
      }
    } catch (error) {
      this.logger.error('Error logging sensor data:', error);
    }
  }

  handleConnection(client: Socket) {
    this.connectedClients.add(client);
    this.reconnectionAttempts.set(client.id, 0);

    this.missionService.initialize(this.server);


    // Envoyer l'état initial des robots et leurs positions au nouveau client
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
    this.logger.log(
      `Client ${client.id} connecté. Nombre total: ${this.connectedClients.size}. Contrôleur: ${this.controllerClientId}`,
    );
  }

  async logCommand(robotId: string, command: string) {
    if (!this.currentMissionId) return;
    try {
      await this.logsService.addLog(this.currentMissionId, {
        type: 'COMMAND',
        robotId,
        data: {
          command,
          timestamp: new Date().toISOString(),
        },
      });

      // Emit updated logs to all clients
      const missionLog = await this.logsService.findMissionLog(this.currentMissionId);
      this.server.emit('missionLogs', missionLog.logs);
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
    this.connectedClients.delete(client);

    // Si le contrôleur se déconnecte, assigner un nouveau contrôleur
    if (
      this.controllerClientId === client.id &&
      this.connectedClients.size > 0
    ) {
      this.controllerClientId = [...this.connectedClients][0].id;
      const newController = [...this.connectedClients].find(
        (c) => c.id === this.controllerClientId,
      );
      if (newController) {
        this.sendControllerStatus(newController, true);
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

  private sendControllerStatus(client: Socket, isController: boolean) {
    client.emit('CONTROLLER_STATUS', { isController });
  }

  private broadcastClientCount() {
    this.server.emit('CLIENT_COUNT', { count: this.connectedClients.size });
    this.logger.log(
      `Nombre de clients connectés: ${this.connectedClients.size}`,
    );
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
    client.emit('CONTROLLER_STATUS', {
      isController: client.id === this.controllerClientId,
    });

    this.logger.log(
      `Client ${client.id} a demandé le nombre de clients connectés: ${this.connectedClients.size}`,
    );
    return { success: true };
  }
}
