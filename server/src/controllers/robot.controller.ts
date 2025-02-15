import { Controller, Post, Param, Logger } from '@nestjs/common';
import { MissionService } from 'src/mission/mission.service';

@Controller('robots')
export class RobotController {
  private readonly logger = new Logger(RobotController.name);

  constructor(private readonly missionService: MissionService) {}

  @Post(':robot_id/mission/start')
  async startMission(@Param('robot_id') robotId: string): Promise<{ message: string }> {
    this.logger.log(`Requête de démarrage de mission pour ${robotId}`);
    return await this.missionService.startMission(robotId);
  }

  @Post(':robot_id/mission/stop')
  async stopMission(@Param('robot_id') robotId: string): Promise<{ message: string }> {
    this.logger.log(`Requête d’arrêt de mission pour ${robotId}`);
    return await this.missionService.stopMission(robotId);
  }

  @Post(':robot_id/identify')
  async identify(@Param('robot_id') robotId: string): Promise<{ message: string }> {
    this.logger.log(`Requête d’identification pour ${robotId}`);
    return await this.missionService.identify(robotId);
  }

  // Nouveaux endpoints pour commander TOUS les robots simultanément
  @Post('mission/start_all')
  async startAllMissions(): Promise<{ message: string }> {
    this.logger.log('Requête de démarrage de mission pour tous les robots');
    return await this.missionService.startMissionsAll();
  }

  @Post('mission/stop_all')
  async stopAllMissions(): Promise<{ message: string }> {
    this.logger.log('Requête d’arrêt de mission pour tous les robots');
    return await this.missionService.stopMissionsAll();
  }
}
