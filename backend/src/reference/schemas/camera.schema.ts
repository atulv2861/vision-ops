import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CameraDocument = Camera & Document;

@Schema({ timestamps: true, collection: 'cameras' })
export class Camera {
  @Prop({ required: true, unique: true })
  cameraId: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  locationName: string;

  @Prop({ required: true })
  zone: string;

  @Prop({ required: true })
  locationType: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ type: Number })
  x?: number; // SVG/Canvas X coordinate for visualization

  @Prop({ type: Number })
  y?: number; // SVG/Canvas Y coordinate for visualization
}

export const CameraSchema = SchemaFactory.createForClass(Camera);
