import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ViolationDocument = Violation & Document;

@Schema({ timestamps: true, collection: 'violations' })
export class Violation {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  timestamp: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true, min: 0, max: 23 })
  hour: number;

  @Prop({ required: true, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] })
  dayOfWeek: string;

  @Prop({
    required: true,
    enum: ['Helmet', 'Speeding', 'Red Light', 'Triple Riding', 'Wrong Side'],
  })
  violationType: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true, enum: ['high', 'medium', 'low'] })
  severity: string;

  @Prop({ required: true })
  licensePlate: string;

  @Prop({ required: true })
  cameraId: string;

  @Prop({
    required: true,
    enum: ['valid', 'unresolved', 'false_positive', 'acknowledged'],
    default: 'valid',
  })
  status: string;
}

export const ViolationSchema = SchemaFactory.createForClass(Violation);
ViolationSchema.index({ date: 1 });
ViolationSchema.index({ hour: 1 });
ViolationSchema.index({ location: 1 });
ViolationSchema.index({ licensePlate: 1 });
ViolationSchema.index({ violationType: 1 });
