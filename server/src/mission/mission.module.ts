import { Module } from '@nestjs/common';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  controllers: [MissionController],
  providers: [MissionService],
  exports: [MissionService],
  imports: [LogsModule]
})
export class MissionModule {}