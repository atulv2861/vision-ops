import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleConfig, VehicleConfigDocument } from './schemas/vehicle-config.schema';
import { VehicleConfigDto } from './dto/vehicle-config.dto';

@Injectable()
export class VehicleConfigService {
    // Default fallback limit if vehicle type not found
    private readonly DEFAULT_LIMIT = 40;

    constructor(
        @InjectModel(VehicleConfig.name)
        private vehicleConfigModel: Model<VehicleConfigDocument>,
    ) { }

    /**
     * Get dwell time limit for a specific vehicle type
     * Returns default limit if vehicle type not found
     */
    async getVehicleLimit(vehicleType: string): Promise<number> {
        try {
            const config = await this.vehicleConfigModel
                .findOne({ vehicleType })
                .lean()
                .exec();
            return config?.dwellTimeLimit || this.DEFAULT_LIMIT;
        } catch (error) {
            return this.DEFAULT_LIMIT;
        }
    }

    /**
     * Get all vehicle limits as a Map for efficient lookup
     * Used to avoid N+1 queries when checking limits for multiple vehicles
     */
    async getAllVehicleLimits(): Promise<Map<string, number>> {
        try {
            const configs = await this.vehicleConfigModel
                .find()
                .select('vehicleType dwellTimeLimit')
                .lean()
                .exec();

            const limitsMap = new Map<string, number>();
            configs.forEach(config => {
                limitsMap.set(config.vehicleType, config.dwellTimeLimit || this.DEFAULT_LIMIT);
            });

            return limitsMap;
        } catch (error) {
            // Return empty map on error, callers will use default limit
            return new Map<string, number>();
        }
    }

    /**
     * Get all vehicle configurations
     */
    async findAll(): Promise<VehicleConfig[]> {
        return this.vehicleConfigModel.find().sort({ vehicleType: 1 }).lean().exec();
    }

    /**
     * Get a specific vehicle configuration
     */
    async findOne(vehicleType: string): Promise<VehicleConfig> {
        const config = await this.vehicleConfigModel
            .findOne({ vehicleType })
            .lean()
            .exec();

        if (!config) {
            throw new NotFoundException(
                `Vehicle configuration for type "${vehicleType}" not found`,
            );
        }

        return config;
    }

    /**
     * Create or update a vehicle configuration
     */
    async upsert(dto: VehicleConfigDto): Promise<VehicleConfig> {
        const updated = await this.vehicleConfigModel
            .findOneAndUpdate(
                { vehicleType: dto.vehicleType },
                { $set: dto },
                { new: true, upsert: true },
            )
            .lean()
            .exec();

        return updated;
    }

    /**
     * Bulk upload vehicle configurations
     */
    async uploadConfigs(configs: VehicleConfigDto[]): Promise<{
        created: number;
        updated: number;
        total: number;
    }> {
        let created = 0;
        let updated = 0;

        for (const config of configs) {
            const existing = await this.vehicleConfigModel
                .findOne({ vehicleType: config.vehicleType })
                .exec();

            if (existing) {
                await this.vehicleConfigModel
                    .updateOne({ vehicleType: config.vehicleType }, { $set: config })
                    .exec();
                updated++;
            } else {
                await this.vehicleConfigModel.create(config);
                created++;
            }
        }

        return { created, updated, total: configs.length };
    }

    /**
     * Delete a vehicle configuration
     */
    async delete(vehicleType: string): Promise<void> {
        const result = await this.vehicleConfigModel
            .deleteOne({ vehicleType })
            .exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException(
                `Vehicle configuration for type "${vehicleType}" not found`,
            );
        }
    }

    /**
     * Seed default vehicle configurations if none exist
     */
    async seedDefaults(): Promise<void> {
        const count = await this.vehicleConfigModel.countDocuments().exec();

        if (count === 0) {
            const defaults: VehicleConfigDto[] = [
                { vehicleType: 'Car', dwellTimeLimit: 20, description: 'Standard passenger car' },
                { vehicleType: 'Truck', dwellTimeLimit: 40, description: 'Heavy goods vehicle' },
                { vehicleType: 'Motorcycle', dwellTimeLimit: 15, description: 'Two-wheeler vehicle' },
                { vehicleType: 'Bus', dwellTimeLimit: 30, description: 'Public transport bus' },
            ];

            await this.vehicleConfigModel.insertMany(defaults);
        }
    }
}
