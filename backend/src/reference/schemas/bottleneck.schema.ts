import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BottleneckDocument = Bottleneck & Document;

@Schema({ timestamps: true, collection: 'bottlenecks' })
export class Bottleneck {
  @Prop({ required: true })
  zone: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  camera: string;

  @Prop({ required: true })
  avgDwell: string;

  @Prop({ required: true })
  journeys: string;

  @Prop({ required: true })
  delays: string;

  @Prop({ required: true, enum: ['high', 'medium', 'low'] })
  severity: string;
}

export const BottleneckSchema = SchemaFactory.createForClass(Bottleneck);
BottleneckSchema.index({ camera: 1 });
