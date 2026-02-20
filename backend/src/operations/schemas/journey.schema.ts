import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JourneyDocument = Journey & Document;

@Schema({ timestamps: true, collection: 'journeys' })
export class Journey {
  @Prop({ required: true })
  journeyId: string;

  @Prop({ required: true })
  licensePlate: string;

  @Prop({ required: true })
  vehicleType: string;

  @Prop({ required: true })
  cameraId: string;

  @Prop({ required: true })
  detectionTime: string;

  @Prop({ required: true, enum: ['entry', 'exit', 'transit'] })
  type: string;

  @Prop({ required: true })
  dockingTime: string;

  @Prop({ required: true })
  dwellTime: string;

  @Prop({ required: true, enum: ['low', 'medium', 'high'] })
  severity: string;
}

export const JourneySchema = SchemaFactory.createForClass(Journey);

// Create indexes for common queries
JourneySchema.index({ journeyId: 1, type: 1, cameraId: 1 }, { unique: true });
JourneySchema.index({ licensePlate: 1 });
JourneySchema.index({ detectionTime: 1 });

