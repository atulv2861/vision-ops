import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FlowDocument = Flow & Document;

@Schema({ timestamps: true, collection: 'flow' })
export class Flow {
  @Prop({ required: true })
  recordType: string;

  @Prop({ type: Object })
  payload: Record<string, unknown>;
}

export const FlowSchema = SchemaFactory.createForClass(Flow);
FlowSchema.index({ recordType: 1 });
