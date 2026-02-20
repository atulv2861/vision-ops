import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CongestionTimeseriesDocument = CongestionTimeseries & Document;

@Schema({ timestamps: true, collection: 'congestion_timeseries' })
export class CongestionTimeseries {
    @Prop({ required: true, unique: true })
    name: string; // Zone name

    @Prop({ type: [Number], required: true })
    data: number[]; // Array of 12 time points for 24-hour congestion
}

export const CongestionTimeseriesSchema = SchemaFactory.createForClass(CongestionTimeseries);
CongestionTimeseriesSchema.index({ name: 1 });
