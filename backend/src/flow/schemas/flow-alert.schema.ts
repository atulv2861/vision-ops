import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FlowAlertDocument = FlowAlert & Document;

@Schema({ timestamps: true, collection: 'flow_alerts' })
export class FlowAlert {
    @Prop({ required: true })
    name: string; // Zone name

    @Prop({ required: true })
    zone: string; // Zone identifier (e.g., "ZONE-001 - Entry Zone")

    @Prop({ required: true, type: Number })
    violations: number;

    @Prop({ required: true, type: Number })
    vehicles: number;

    @Prop({ required: true, type: Number })
    queue: number;

    @Prop({ required: true, type: Number })
    queueVal: number;

    @Prop({ type: [String], default: [] })
    alerts: string[]; // Array of alert messages
}

export const FlowAlertSchema = SchemaFactory.createForClass(FlowAlert);
FlowAlertSchema.index({ name: 1 });
