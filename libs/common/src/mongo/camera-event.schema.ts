import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CameraEventDocument = CameraEvent & Document;

@Schema({ _id: false })
export class PersonData {
    @Prop({ type: String })
    person_id: string;

    @Prop({ type: String })
    person_type: string;

    @Prop({ type: Number })
    dwell_time: number;
}

const PersonDataSchema = SchemaFactory.createForClass(PersonData);

@Schema({ timestamps: { createdAt: 'indexed_at', updatedAt: false }, collection: 'vision_ops_camera' })
export class CameraEvent {
    @Prop({ type: String })
    client_id?: string;

    @Prop({ type: String, required: true, index: true })
    camera_id: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: String })
    status?: string;

    @Prop({ type: String, required: true })
    timestamp: string;

    @Prop({ type: String })
    location?: string;

    @Prop({ type: String })
    location_id?: string;

    @Prop({ type: Number, default: 0 })
    occupancy_capacity: number;

    @Prop({ type: Number, default: 0 })
    total_person: number;

    @Prop({ type: [PersonDataSchema], default: [] })
    person_data: PersonData[];

    @Prop({ type: Number, default: 0 })
    unique_person: number;

    @Prop({ type: Number })
    avg_dwell_time?: number;

    @Prop({ type: Number })
    cumulative_unique_person?: number;
}

export const CameraEventSchema = SchemaFactory.createForClass(CameraEvent);
