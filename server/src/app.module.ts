import { Module } from '@nestjs/common';
import { RobotController } from 'src/controllers/robot.controller';
import { MissionModule } from './mission/mission.module';
import { GatewayModule } from './gateways/gateway.module';

@Module({
  imports: [MissionModule, GatewayModule],
  controllers: [RobotController],
})
export class AppModule {}
