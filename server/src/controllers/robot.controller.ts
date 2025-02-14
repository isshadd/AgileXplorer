import { Controller, Post, Param, Logger } from '@nestjs/common';
import { MissionService } from 'src/mission/mission.service';

@Controller('robots/:robot_id')
export class RobotController {
  private readonly logger = new Logger(RobotController.name);

  constructor(private readonly missionService: MissionService) {}

  @Post('mission/start')
  async startMission(@Param('robot_id') robotId: string): Promise<{ message: string }> {
    this.logger.log(`Requête de démarrage de mission pour ${robotId}`);
    return await this.missionService.startMission(robotId);
  }

  @Post('mission/stop')
  async stopMission(@Param('robot_id') robotId: string): Promise<{ message: string }> {
    this.logger.log(`Requête d’arrêt de mission pour ${robotId}`);
    return await this.missionService.stopMission(robotId);
  }

  @Post('identify')
  async identify(@Param('robot_id') robotId: string): Promise<{ message: string }> {
    this.logger.log(`Requête d’identification pour ${robotId}`);
    return await this.missionService.identify(robotId);
  }
}
