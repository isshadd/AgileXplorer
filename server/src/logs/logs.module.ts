import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogsService } from './logs.service';
import { MissionLog, MissionLogSchema } from './schemas/mission-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MissionLog.name, schema: MissionLogSchema }])
  ],
  providers: [LogsService],
  exports: [LogsService]
})
export class LogsModule {}