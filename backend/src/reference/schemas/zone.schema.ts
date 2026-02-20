import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ZoneDocument = Zone & Document;

@Schema({ timestamps: true, collection: 'zones' })
export class Zone {
  @Prop({ required: true, unique: true })
  zoneId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop({ default: '' })
  description: string;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);
