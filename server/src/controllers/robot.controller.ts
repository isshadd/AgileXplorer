import { Controller, Post, Get, Param, Logger } from '@nestjs/common';
import { MissionService } from '../mission/mission.service';

@Controller('robot')
export class RobotController {
  private readonly logger = new Logger(RobotController.name);

  constructor(private readonly missionService: MissionService) {}

  @Post('start-mission')
  async startMission() {
    const result = await this.missionService.startMission();
    return result; // This will now return { missionId: string }
  }

  @Post('stop-mission')
  async stopMission() {
    const result = await this.missionService.stopMission();
    return result; // This will return { stoppedMissionId: string }
  }

  @Get('mission/:missionId/logs')
  async getMissionLogs(@Param('missionId') missionId: string) {
    return await this.missionService.getMissionLogs(missionId);
  }

  @Post(':robot_id/mission/return')
  async returnToBase(
    @Param('robot_id') robotId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Requête de retour à la base pour ${robotId}`);
    return await this.missionService.returnToBase(robotId);
  }

  @Post(':robot_id/identify')
  async identify(
    @Param('robot_id') robotId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Requête d’identification pour ${robotId}`);
    return await this.missionService.identify(robotId);
  }

  @Get('active-mission')
  getActiveMission() {
    const missionId = this.missionService.getActiveMissionId();
    return { missionId };
  }
}
