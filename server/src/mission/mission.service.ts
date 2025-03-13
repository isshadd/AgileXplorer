import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);
  private activeMissionId: string | null = null;

  constructor(private readonly logsService: LogsService) {
    this.logger.log('MissionService initialized');
  }

  async startMission() {
    this.activeMissionId = uuidv4();
    this.logger.log(`Starting mission with ID: ${this.activeMissionId}`);
    
    try {
      const log = await this.logsService.create({
        type: 'MISSION_START',
        message: 'Mission started',
        missionId: this.activeMissionId,
        data: {
          timestamp: new Date().toISOString()
        }
      });
      
      this.logger.debug(`Created mission start log`);
      return { missionId: this.activeMissionId };
    } catch (error) {
      this.logger.error(`Error creating mission start log: ${error.message}`, error.stack);
      throw error;
    }
  }

  async stopMission() {
    const stoppedMissionId = this.activeMissionId;
    this.logger.log(`Stopping mission with ID: ${stoppedMissionId}`);
    
    if (stoppedMissionId) {
      try {
        const log = await this.logsService.create({
          type: 'MISSION_STOP',
          message: 'Mission stopped',
          missionId: stoppedMissionId,
          data: {
            timestamp: new Date().toISOString()
          }
        });
        
        this.logger.debug(`Created mission stop log`);
      } catch (error) {
        this.logger.error(`Error creating mission stop log: ${error.message}`, error.stack);
        throw error;
      }
    } else {
      this.logger.warn('Attempted to stop mission but no active mission found');
    }
    
    this.activeMissionId = null;
    return { stoppedMissionId };
  }

  getActiveMissionId() {
    return this.activeMissionId;
  }

  async getMissionLogs(missionId: string) {
    this.logger.log(`Getting logs for mission ID: ${missionId}`);
    try {
      const logs = await this.logsService.findByMissionId(missionId);
      this.logger.debug(`Found ${logs.length} logs for mission ID: ${missionId}`);
      return logs;
    } catch (error) {
      this.logger.error(`Error getting logs for mission ID ${missionId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
