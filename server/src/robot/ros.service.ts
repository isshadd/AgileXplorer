import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { MissionService } from '../mission/mission.service';
import { LogsService } from '../logs/logs.service';
import { Position } from '../interfaces/robot.interface';
import * as rclnodejs from 'rclnodejs';

@Injectable()
export class RosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RosService.name);
  private node: rclnodejs.Node;
  private subscribers: Map<string, any> = new Map();

  constructor(
    private readonly missionService: MissionService,
    private readonly logsService: LogsService,
  ) {}

  async onModuleInit() {
    try {
      // Attendre l'initialisation de rclnodejs par MissionService
      await this.missionService.waitForInitialization();

      const nodeId = Math.random().toString(36).substring(7);
      this.node = new rclnodejs.Node(`ros_service_${nodeId}`);

      // Subscribe to each robot's topics
      const robotIds = ['robot1', 'robot2'];
      robotIds.forEach((robotId) => this.setupRobotSubscribers(robotId));

      this.node.spin();
      this.logger.log('ROS 2 node initialized');
    } catch (error) {
      this.logger.error('Failed to initialize ROS 2:', error);
    }
  }

  async onModuleDestroy() {
    this.subscribers.forEach((subscriber) => subscriber.dispose());
    if (this.node) {
      this.node.destroy();
    }
    await rclnodejs.shutdown();
    this.logger.log('ROS 2 node destroyed');
  }

  private setupRobotSubscribers(robotId: string) {
    // Subscribe to position topic
    const positionSub = this.node.createSubscription(
      'nav_msgs/msg/Odometry',
      `/${robotId}/odom`,
      (msg: any) => {
        const position: Position = {
          x: msg.pose.pose.position.x,
          y: msg.pose.pose.position.y,
          z: msg.pose.pose.position.z,
        };
        this.updateRobotPosition(robotId, position);
      },
    );
    this.subscribers.set(`${robotId}_position`, positionSub);

    // Subscribe to sensor data topic
    const sensorSub = this.node.createSubscription(
      'sensor_msgs/msg/Range',
      `/${robotId}/range`,
      (msg: any) => {
        this.updateRobotDistance(robotId, msg.range);
      },
    );
    this.subscribers.set(`${robotId}_sensor`, sensorSub);

    // Subscribe to battery state
    const batterySub = this.node.createSubscription(
      'sensor_msgs/msg/BatteryState',
      `/${robotId}/battery_state`,
      (msg: any) => {
        this.updateRobotBattery(robotId, msg.percentage);
      },
    );
    this.subscribers.set(`${robotId}_battery`, batterySub);
  }

  private updateRobotPosition(robotId: string, position: Position) {
    const missionId = this.missionService.getActiveMissionId();
    if (missionId) {
      this.logsService
        .addLog(missionId, {
          type: 'SENSOR',
          robotId,
          data: {
            position,
            timestamp: new Date().toISOString(),
          },
        })
        .catch((error) => {
          this.logger.error(
            `Failed to log position for robot ${robotId}:`,
            error,
          );
        });
    }
  }

  private updateRobotDistance(robotId: string, distance: number) {
    const missionId = this.missionService.getActiveMissionId();
    if (missionId) {
      this.logsService
        .addLog(missionId, {
          type: 'SENSOR',
          robotId,
          data: {
            distance,
            timestamp: new Date().toISOString(),
          },
        })
        .catch((error) => {
          this.logger.error(
            `Failed to log distance for robot ${robotId}:`,
            error,
          );
        });
    }
  }

  private updateRobotBattery(robotId: string, batteryLevel: number) {
    const missionId = this.missionService.getActiveMissionId();
    if (missionId) {
      this.logsService
        .addLog(missionId, {
          type: 'SENSOR',
          robotId,
          data: {
            batteryLevel,
            timestamp: new Date().toISOString(),
          },
        })
        .catch((error) => {
          this.logger.error(
            `Failed to log battery for robot ${robotId}:`,
            error,
          );
        });
    }
  }
}
