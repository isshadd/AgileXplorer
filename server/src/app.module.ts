import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { RobotModule } from './robot/robot.module';
import { LogsModule } from './logs/logs.module';
import { MissionModule } from './mission/mission.module';
import { config } from 'dotenv';

config(); // Load environment variables

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ScheduleModule.forRoot(),
    RobotModule,
    LogsModule,
    MissionModule,
  ],
})
export class AppModule {}
