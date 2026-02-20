import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Violation, ViolationDocument } from '../violations/schemas/violation.schema';
import { Camera, CameraDocument } from '../reference/schemas/camera.schema';

export interface MapLocation {
    id: string;
    name: string;
    severity: 'high' | 'medium' | 'low';
    violations: number;
    x: number;
    y: number;
    cameraId: string;
    zone: string;
}

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(Violation.name) private violationModel: Model<ViolationDocument>,
        @InjectModel(Camera.name) private cameraModel: Model<CameraDocument>,
    ) { }

    async getMapData(startDate?: string, endDate?: string, timezoneOffsetMinutes: number = 0): Promise<MapLocation[]> {
        // Build date filter for aggregation
        const matchStage: any = {};
        if (startDate || endDate) {
            const timestampFilter: any = {};
            if (startDate) {
                // Parse date in user's timezone
                const [year, month, day] = startDate.split('-').map(Number);
                const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                // Adjust for user's timezone: add the offset to get UTC time
                start.setMinutes(start.getMinutes() + timezoneOffsetMinutes);
                timestampFilter.$gte = start;
            }
            if (endDate) {
                // Parse date in user's timezone
                const [year, month, day] = endDate.split('-').map(Number);
                const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
                // Adjust for user's timezone: add the offset to get UTC time
                end.setMinutes(end.getMinutes() + timezoneOffsetMinutes);
                timestampFilter.$lte = end;
            }
            matchStage.timestamp = timestampFilter;
        }

        // Aggregate violations by camera with optional date filter
        const pipeline: any[] = [];
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }
        pipeline.push({
            $group: {
                _id: '$cameraId',
                count: { $sum: 1 },
            },
        });

        const violationCounts = await this.violationModel.aggregate(pipeline);

        // Create a map of cameraId -> violation count
        const countsMap = new Map<string, number>();
        violationCounts.forEach((item) => {
            countsMap.set(item._id, item.count);
        });

        // Get all cameras with x,y coordinates
        const cameras = await this.cameraModel
            .find({
                x: { $exists: true, $ne: null },
                y: { $exists: true, $ne: null },
            })
            .lean()
            .exec();

        // Map cameras to location data
        const locations: MapLocation[] = cameras
            .filter((camera) => camera.x !== undefined && camera.y !== undefined)
            .map((camera) => {
                const violations = countsMap.get(camera.cameraId) || 0;
                const severity = this.calculateSeverity(violations);

                return {
                    id: camera.cameraId,
                    name: camera.locationName,
                    severity,
                    violations,
                    x: camera.x!,
                    y: camera.y!,
                    cameraId: camera.cameraId,
                    zone: camera.zone,
                };
            });

        return locations;
    }

    private calculateSeverity(violations: number): 'high' | 'medium' | 'low' {
        if (violations >= 45) return 'high';
        if (violations >= 35) return 'medium';
        return 'low';
    }
}
