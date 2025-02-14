import { Module } from '@nestjs/common';
import { RobotController } from 'src/controllers/robot.controller';
import { MissionModule } from './mission/mission.module';  // Ensure the path is correct

@Module({
  imports: [MissionModule],  // Import MissionModule
  controllers: [RobotController],
})
export class AppModule {}
