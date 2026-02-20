import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/** Single person entry in people_distribution */
export class PersonDataItem {
  person_id: string;
  person_type: string;
  dwell_time: number;
}

/** Incoming timestamp format: "yyyy-MM-dd HH:mm:ss" (stored as string in same format). */
export type PeopleDistributionDocument = PeopleDistribution & Document;

@Schema({ timestamps: true, collection: 'people_distribution' })
export class PeopleDistribution {
  @Prop({ type: String, default: '' })
  client_id: string;

  @Prop({ type: String, default: '' })
  camera_id: string;

  @Prop({ type: String, default: '' })
  name: string;

  /** Stored as received: "yyyy-MM-dd HH:mm:ss" */
  @Prop({ type: String, default: '' })
  timestamp: string;

  @Prop({ type: String, default: '' })
  location: string;

  @Prop({ type: String, default: '' })
  location_id: string;

  @Prop({ type: Number, default: 0 })
  occupancy_capacity: number;

  @Prop({ type: Number, default: 0 })
  total_person: number;

  @Prop({ type: Number })
  avg_dwell_time?: number;

  @Prop({
    type: [
      {
        person_id: String,
        person_type: String,
        dwell_time: Number,
      },
    ],
    default: [],
  })
  person_data: PersonDataItem[];

  @Prop({ type: Number, default: 0 })
  unique_person: number;
}

export const PeopleDistributionSchema =
  SchemaFactory.createForClass(PeopleDistribution);
PeopleDistributionSchema.index({ camera_id: 1, timestamp: -1 });
PeopleDistributionSchema.index({ timestamp: -1 });
PeopleDistributionSchema.index({ client_id: 1 });
