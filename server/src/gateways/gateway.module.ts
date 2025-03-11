import { Module } from '@nestjs/common';
import { RobotGateway } from './robot.gateway';
import { MissionModule } from '../mission/mission.module';

@Module({
  imports: [MissionModule],
  providers: [RobotGateway],
  exports: [RobotGateway],
})
export class GatewayModule {}
