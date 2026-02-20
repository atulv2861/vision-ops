import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FlowZoneDocument = FlowZone & Document;

@Schema({ timestamps: true, collection: 'flow_zones' })
export class FlowZone {
    @Prop({ required: true, unique: true })
    zoneName: string;

    @Prop({ required: true })
    type: string; // Entry, Loading, Parking, Transit, Docking, Restricted

    @Prop({ required: true, type: Number })
    vehicleCount: number;

    @Prop({ required: true, type: Number })
    vehicleMax: number;

    @Prop({ required: true, type: Number })
    queueLength: number;

    @Prop({ required: true })
    dwellTime: string;

    @Prop({ required: true })
    congestion: string; // Normal, Moderate, Severe

    @Prop({ required: true })
    dominantVehicle: string;

    @Prop({ required: true, type: Number })
    violations: number;
}

export const FlowZoneSchema = SchemaFactory.createForClass(FlowZone);
FlowZoneSchema.index({ zoneName: 1 });
FlowZoneSchema.index({ congestion: 1 });
