import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { MissionService } from '../mission/mission.service';

@Controller('robot')
export class RobotController {
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

  @Get('active-mission')
  getActiveMission() {
    const missionId = this.missionService.getActiveMissionId();
    return { missionId };
  }
}
