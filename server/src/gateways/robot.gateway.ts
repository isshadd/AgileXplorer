import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MissionService } from '../mission/mission.service';
import { LogsService } from '../logs/logs.service';
import { WebSocketEvent } from '../interfaces/websocket.interface';
import { Logger, OnModuleDestroy, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RobotGateway implements OnModuleDestroy {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(RobotGateway.name);
  private activeConnections = new Set<Socket>();
  private sensorDataInterval: NodeJS.Timeout;
  private currentMissionId: string | null = null;

  constructor(
    private readonly missionService: MissionService,
    private readonly logsService: LogsService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.activeConnections.add(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.activeConnections.delete(client);
  }

  @SubscribeMessage('startMission')
  handleStartMission() {
    const result = this.missionService.startMission();
    this.currentMissionId = result.missionId;
    this.startSensorDataLogging();
    this.server.emit('missionStarted', result);
    return result;
  }

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

  async logCommand(robotId: string, command: string) {
    if (!this.currentMissionId) return;

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
}