import { Module } from '@nestjs/common';
import { RobotGateway } from './robot.gateway';
import { MissionModule } from '../mission/mission.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [MissionModule, LogsModule],
  providers: [RobotGateway],
  exports: [RobotGateway],
})
export class GatewayModule {}
