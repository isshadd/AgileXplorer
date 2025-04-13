import { Controller, Post, Get, Param, Logger, Body } from '@nestjs/common';
import { MissionService } from '../mission/mission.service';
import { RosService } from '../robot/ros.service';

@Controller('robot')
export class RobotController {
  private readonly logger = new Logger(RobotController.name);

  constructor(
    private readonly missionService: MissionService,
    private readonly rosService: RosService,
  ) {}

  @Post(':robot_id/mission/start')
  async startMission(@Param('robot_id') robotId: string) {
    this.logger.log(`Démarrage de la mission pour ${robotId}`);
    const result = await this.missionService.startMission(robotId);
    return result;
  }

  @Post(':robot_id/mission/stop')
  async stopMission(@Param('robot_id') robotId: string) {
    this.logger.log(`Arrêt de la mission pour ${robotId}`);
    const result = await this.missionService.stopMission(robotId);
    return result;
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

  @Post(':robot_id/p2p')
  async toggleP2P(
    @Param('robot_id') robotId: string,
    @Body() body: { enable: boolean },
  ) {
    this.logger.log(`Configuration P2P pour ${robotId}: ${body.enable}`);
    this.rosService.publishP2PCommand(robotId, body.enable);
    return {
      message: `Mode P2P ${body.enable ? 'activé' : 'désactivé'} pour ${robotId}`,
    };
  }
}
