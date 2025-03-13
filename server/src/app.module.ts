import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RobotModule } from './robot/robot.module';
import { LogsModule } from './logs/logs.module';
import { config } from 'dotenv';

config(); // Load environment variables

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI),
    RobotModule,
    LogsModule
  ],
})
export class AppModule {}
