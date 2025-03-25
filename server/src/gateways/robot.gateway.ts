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
  InitialPositionMessage,
  RobotPosition,
  ErrorPayload,
  MapDataMessage,
  MapDataPayload,
  LimoStatusPayload
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
  private readonly logger = new Logger(RobotGateway.name);
  private feedbackNode: rclnodejs.Node;
  private batteryInterval: NodeJS.Timeout;
  private robotBatteryLevels: Map<string, number> = new Map([
    ['robot1_102', 100],
    ['robot2_102', 100]
  ]);

  private readonly SIMULATE_BATTERY = 'false';
  private readonly MIN_VOLTAGE = 9;
  private readonly MAX_VOLTAGE = 12.6;

  constructor(private readonly missionService: MissionService) {
    this.initROS2();
    if (this.SIMULATE_BATTERY) {
      this.logger.log('Starting battery simulation mode');
      // this.startBatterySimulation();
    }
  }

  private calculateBatteryPercentage(voltage: number): number {
    const percentage = ((voltage - this.MIN_VOLTAGE) / (this.MAX_VOLTAGE - this.MIN_VOLTAGE)) * 100;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  private startBatterySimulation() {
    this.batteryInterval = setInterval(() => {
      for (const [robotId, level] of this.robotBatteryLevels.entries()) {
        // Simulate voltage between MIN_VOLTAGE and MAX_VOLTAGE
        const reduction = Math.random() * 0.1; // Small voltage drop
        const currentVoltage = this.MIN_VOLTAGE +
          ((this.MAX_VOLTAGE - this.MIN_VOLTAGE) * level / 100);
        
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
            battery_level: batteryLevel
          }
        });
      }
    }, 2000);
  }
private async initROS2() {
  try {
    
    try {
      await rclnodejs.init();
    } catch (error) {
      if (!error.message.includes('already been initialized')) {
        throw error;
      }
    }
    this.feedbackNode = rclnodejs.createNode('robot_feedback_node');
    
    // Abonnement aux données de statut et de batterie
    this.feedbackNode.createSubscription(
      'limo_msgs/msg/LimoStatus',
      '/robot1_102/limo_status',
      (rosMsg: any) => {
        // Transform ROS message to our interface format
        const msg: LimoStatusPayload = {
          robotId: 'robot1_102', // You might want to make this dynamic
          vehicle_state: rosMsg.vehicle_state,
          control_mode: rosMsg.control_mode,
          battery_voltage: rosMsg.battery_voltage,
          error_code: rosMsg.error_code,
          motion_mode: rosMsg.motion_mode
        };
        
        const batteryLevel = this.calculateBatteryPercentage(msg.battery_voltage);
        this.logger.log(`Received battery update - Robot: ${msg.robotId}, Battery Level: ${batteryLevel}V`);
        
        this.server.emit('BATTERY_DATA', {
          type: 'BATTERY_DATA',
          payload: {
            robotId: msg.robotId,
            battery_level: batteryLevel
          }
        });
      });
    

      this.feedbackNode.createSubscription(
        'limo_msgs/msg/LimoStatus',
        '/robot2_102/limo_status',
        (rosMsg: any) => {
          // Transform ROS message to our interface format
          const msg: LimoStatusPayload = {
            robotId: 'robot2_102', // You might want to make this dynamic
            vehicle_state: rosMsg.vehicle_state,
            control_mode: rosMsg.control_mode,
            battery_voltage: rosMsg.battery_voltage,
            error_code: rosMsg.error_code,
            motion_mode: rosMsg.motion_mode
          };

          const batteryLevel = this.calculateBatteryPercentage(msg.battery_voltage);
          this.logger.log(`Received battery update - Robot: ${msg.robotId}, Battery Level: ${batteryLevel}V`);

          this.server.emit('BATTERY_DATA', {
            type: 'BATTERY_DATA',
            payload: {
              robotId: msg.robotId,
              battery_level: batteryLevel
            }
          });
        });


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
    if (this.batteryInterval) {
      clearInterval(this.batteryInterval);
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
}
