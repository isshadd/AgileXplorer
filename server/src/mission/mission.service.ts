import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LogsService } from '../logs/logs.service';

interface Robot {
  id: string;
  position: { x: number; y: number; z: number };
  distance: number;
}

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);
  private activeMissionId: string | null = null;
  private activeRobots: Map<string, Robot> = new Map();

  constructor(private readonly logsService: LogsService) {
    this.logger.log('MissionService initialized');
    // Initialize with test robots
    this.activeRobots.set('robot1', {
      id: 'robot1',
      position: { x: 0, y: 0, z: 0 },
      distance: 0
    });
    this.activeRobots.set('robot2', {
      id: 'robot2',
      position: { x: 1, y: 1, z: 0 },
      distance: 0
    });
  }

  startMission() {
    this.activeMissionId = uuidv4();
    this.logger.log(`Starting mission with ID: ${this.activeMissionId}`);
    
    // Initialize mission log
    this.logsService.initializeMissionLog(this.activeMissionId)
      .then(() => {
        for (const robot of this.activeRobots.values()) {
          this.logsService.addLog(this.activeMissionId, {
            type: 'COMMAND',
            robotId: robot.id,
            data: {
              command: 'START_MISSION',
              timestamp: new Date().toISOString()
            }
          });
        }
      })
      .catch(error => {
        this.logger.error(`Error initializing mission log: ${error.message}`, error.stack);
      });

    return { missionId: this.activeMissionId };
  }

  async stopMission() {
    const stoppedMissionId = this.activeMissionId;
    this.logger.log(`Stopping mission with ID: ${stoppedMissionId}`);
    
    if (!stoppedMissionId) {
      this.logger.warn('Attempted to stop mission but no active mission found');
      return { stoppedMissionId: null };
    }
    
    // Clear the mission ID first to prevent any new logs
    this.activeMissionId = null;

    try {
      // Add final stop command and finalize in one operation
      await this.logsService.finalizeMissionLog(stoppedMissionId);
      this.logger.debug(`Mission log finalized`);
      return { stoppedMissionId };
    } catch (error) {
      this.logger.error(`Error finalizing mission log: ${error.message}`, error.stack);
      throw error;
    }
  }

  getActiveMissionId() {
    return this.activeMissionId;
  }

  getActiveRobots(): Robot[] {
    return Array.from(this.activeRobots.values());
  }

  updateRobotData(robotId: string, position: { x: number; y: number; z: number }, distance: number) {
    const robot = this.activeRobots.get(robotId);
    if (robot) {
      robot.position = position;
      robot.distance = distance;
      this.activeRobots.set(robotId, robot);

      // Log robot data if mission is active
      if (this.activeMissionId) {
        this.logsService.addLog(this.activeMissionId, {
          type: 'SENSOR',
          robotId,
          data: {
            position,
            distance,
            timestamp: new Date().toISOString()
          }
        }).catch(error => {
          this.logger.error(`Error logging robot data: ${error.message}`, error.stack);
        });
      }
    }
  }

  async getMissionLogs(missionId: string) {
    this.logger.log(`Getting logs for mission ID: ${missionId}`);
    try {
      const missionLog = await this.logsService.findMissionLog(missionId);
      this.logger.debug(`Found mission log with ${missionLog.logs.length} entries`);
      return missionLog;
    } catch (error) {
      this.logger.error(`Error getting mission log: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMissions(): Promise<any[]> {
    try {
      const missionLogs = await this.logsService.findAllMissionLogs();
      return missionLogs.map(log => ({
        id: log.missionId,
        startTime: log.startTime,
        endTime: log.endTime,
        status: log.endTime ? 'completed' : 'ongoing',
        robots: log.logs
          .filter(entry => entry.type === 'COMMAND' && entry.data.command === 'START_MISSION')
          .map(entry => entry.robotIds),
        logs: log.logs
      }));
    } catch (error) {
      this.logger.error(`Error getting missions: ${error.message}`, error.stack);
      throw error;
    }
  }
}
