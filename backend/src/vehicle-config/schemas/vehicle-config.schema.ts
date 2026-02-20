import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VehicleConfigDocument = VehicleConfig & Document;

@Schema({ timestamps: true })
export class VehicleConfig {
    @Prop({ required: true, unique: true, index: true })
    vehicleType: string; // e.g., "Car", "Truck", "Motorcycle", "Bus"

    @Prop({ required: true, min: 0 })
    dwellTimeLimit: number; // in minutes - threshold for considering a vehicle delayed

    @Prop()
    description?: string; // Optional description of the vehicle type
}

export const VehicleConfigSchema = SchemaFactory.createForClass(VehicleConfig);
