import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LogDocument = Log & Document;

@Schema({ collection: 'Logs' })
export class Log {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  type: string;

  @Prop()
  message?: string;

  @Prop()
  missionId?: string;

  @Prop()
  robotId?: string;

  @Prop({ type: Object })
  data?: {
    position?: { x: number; y: number; z: number };
    distance?: number;
    command?: string;
    [key: string]: any;
  };
}

export const LogSchema = SchemaFactory.createForClass(Log);
