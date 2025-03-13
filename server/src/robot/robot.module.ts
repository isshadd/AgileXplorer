import { Module } from '@nestjs/common';
import { RobotController } from '../controllers/robot.controller';
import { RobotGateway } from '../gateways/robot.gateway';
import { MissionService } from '../mission/mission.service';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  controllers: [RobotController],
  providers: [RobotGateway, MissionService],
  exports: [RobotGateway, MissionService]
})
export class RobotModule {}