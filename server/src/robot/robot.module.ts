import { Module } from '@nestjs/common';
import { RobotController } from '../controllers/robot.controller';
import { RobotGateway } from '../gateways/robot.gateway';
import { LogsModule } from '../logs/logs.module';
import { MissionModule } from '../mission/mission.module';
import { RosService } from './ros.service';

@Module({
  imports: [LogsModule, MissionModule],
  controllers: [RobotController],
  providers: [RobotGateway, RosService],
  exports: [RobotGateway, RosService]
})
export class RobotModule {}