import { Module } from '@nestjs/common';
import { MissionService } from './mission.service';

@Module({
  providers: [MissionService],  // Register MissionService
  exports: [MissionService],    // Export MissionService to make it available in other modules
})
export class MissionModule {}