import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/** Enriched camera status payload (from Kafka + camera details API). Stored in MongoDB collection camera_status and ES index camera_status. */
export type CameraStatusDocument = CameraStatus & Document;

/** Incoming timestamp format: "yyyy-MM-dd HH:mm:ss" (stored as string in same format). */
@Schema({ timestamps: true, collection: 'camera_status' })
export class CameraStatus {
  @Prop({ type: String, default: '' })
  client_id: string;

  @Prop({ type: String, default: '' })
  location_id: string;

  @Prop({ type: String, default: '' })
  location: string;

  @Prop({ type: String, default: '' })
  camera_id: string;

  /** Stored as received: "yyyy-MM-dd HH:mm:ss" */
  @Prop({ type: String, default: '' })
  timestamp: string;

  @Prop({ type: Number, required: true })
  camera_status: number;

  @Prop({ type: Object })
  camera_details?: {
    camera_id: string;
    name: string;
    client_id: string;
    location: string;
    location_id: string;
  };
}

export const CameraStatusSchema = SchemaFactory.createForClass(CameraStatus);
CameraStatusSchema.index({ camera_id: 1, timestamp: -1 });
CameraStatusSchema.index({ timestamp: -1 });
