import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MissionLogDocument = MissionLog & Document;

interface LogEntry {
  timestamp: Date;
  type: 'SENSOR' | 'COMMAND';
  robotIds: string[];  // Changed from robotId to robotIds array
  data: {
    position?: { x: number; y: number; z: number };
    distance?: number;
    command?: string;
    [key: string]: any;
  };
}
@Schema()
class MapData {
  @Prop({ type: Date, required: true })
  timestamp: Date;

  @Prop({ type: String, required: true })
  data: string; // Base64 encoded map data or JSON string
}

const MapDataSchema = SchemaFactory.createForClass(MapData);

@Schema({ collection: 'MissionLogs', timestamps: true })
export class MissionLog {
  @Prop({ required: true, unique: true })
  missionId: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ type: MapDataSchema })
  map?: MapData;

  @Prop({ type: [Object], default: [] })
  logs: LogEntry[];

  @Prop({ type: Number })
  totalDistance?: number;
}

export const MissionLogSchema = SchemaFactory.createForClass(MissionLog);