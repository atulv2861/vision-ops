import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Journey, JourneyDocument } from './schemas/journey.schema';
import { Violation, ViolationDocument } from '../violations/schemas/violation.schema';
import { Camera, CameraDocument } from '../reference/schemas/camera.schema';
import { VehicleConfigService } from '../vehicle-config/vehicle-config.service';

interface AggregatedJourney {
  journeyId: string;
  licensePlate: string;
  vehicleType: string;
  entryPoint: string;
  exitPoint: string;
  transitTime: string;
  dockingTime: string;
  dwellTime: string;
  alerts: number;
  status: string;
}

@Injectable()
export class OperationsService {
  constructor(
    @InjectModel(Journey.name) private journeyModel: Model<JourneyDocument>,
    @InjectModel(Violation.name) private violationModel: Model<ViolationDocument>,
    @InjectModel(Camera.name) private cameraModel: Model<CameraDocument>,
    private vehicleConfigService: VehicleConfigService,
  ) { }

  async getJourneys(limit = 100): Promise<AggregatedJourney[]> {
    // Fetch all journey detections
    const detections = await this.journeyModel
      .find()
      .sort({ detectionTime: 1 })
      .lean()
      .exec();

    // Group detections by journeyId
    const journeyMap = new Map<string, any[]>();
    for (const detection of detections) {
      const id = detection.journeyId;
      if (!journeyMap.has(id)) {
        journeyMap.set(id, []);
      }
      journeyMap.get(id)!.push(detection);
    }

    // 🚀 OPTIMIZATION: Fetch all violations in a single query to avoid N+1 problem
    // Collect all unique license plates and their time ranges
    const journeyTimeRanges: Array<{ licensePlate: string; startTime: string; endTime: string }> = [];
    for (const [, dets] of journeyMap.entries()) {
      const entry = dets.find(d => d.type === 'entry');
      if (!entry) continue;

      const exit = dets.find(d => d.type === 'exit');
      const startTime = entry.detectionTime;
      const endTime = exit?.detectionTime || new Date().toISOString();

      journeyTimeRanges.push({ licensePlate: entry.licensePlate, startTime, endTime });
    }

    // Build $or query to fetch all relevant violations in one go
    const violations = journeyTimeRanges.length > 0
      ? await this.violationModel.find({
        $or: journeyTimeRanges.map(({ licensePlate, startTime, endTime }) => ({
          licensePlate,
          timestamp: { $gte: startTime, $lte: endTime },
        })),
      }).lean().exec()
      : [];

    // Group violations by license plate and time range for quick lookup
    const violationMap = new Map<string, number>();
    for (const { licensePlate, startTime, endTime } of journeyTimeRanges) {
      const key = `${licensePlate}:${startTime}:${endTime}`;
      const count = violations.filter(
        v => v.licensePlate === licensePlate &&
          v.timestamp >= startTime &&
          v.timestamp <= endTime
      ).length;
      violationMap.set(key, count);
    }

    // Aggregate each journey
    const aggregated: AggregatedJourney[] = [];
    for (const [journeyId, dets] of journeyMap.entries()) {
      // Find entry, exit, and transit detections
      const entry = dets.find(d => d.type === 'entry');
      const exit = dets.find(d => d.type === 'exit');
      const transits = dets.filter(d => d.type === 'transit');

      if (!entry) continue; // Skip if no entry point

      // Format entry point
      const entryTime = this.formatTime(entry.detectionTime);
      const entryPoint = `${entry.cameraId} (${entryTime})`;

      // Format exit point or show "In Progress"
      let exitPoint = 'In Progress';
      let transitTimeMinutes = 0;

      if (exit) {
        const exitTime = this.formatTime(exit.detectionTime);
        exitPoint = `${exit.cameraId} (${exitTime})`;

        // Calculate transit time from entry to exit
        const entryDate = new Date(entry.detectionTime);
        const exitDate = new Date(exit.detectionTime);
        transitTimeMinutes = Math.round((exitDate.getTime() - entryDate.getTime()) / (1000 * 60));
      } else {
        // If no exit, calculate from entry to last known detection
        const lastDetection = dets[dets.length - 1];
        const entryDate = new Date(entry.detectionTime);
        const lastDate = new Date(lastDetection.detectionTime);
        transitTimeMinutes = Math.round((lastDate.getTime() - entryDate.getTime()) / (1000 * 60));
      }

      // Parse and sum docking times (assuming format like "0 min", "40 min")
      const totalDockingMinutes = dets.reduce((sum, d) => sum + this.parseMinutesSafely(d.dockingTime), 0);

      // Parse and sum dwell times
      const totalDwellMinutes = dets.reduce((sum, d) => sum + this.parseMinutesSafely(d.dwellTime), 0);

      // Calculate time range for violation matching
      const startTime = entry.detectionTime;
      const endTime = exit?.detectionTime || new Date().toISOString();

      // 🚀 OPTIMIZATION: Get violation count from pre-fetched map instead of querying DB
      const violationKey = `${entry.licensePlate}:${startTime}:${endTime}`;
      const violationCount = violationMap.get(violationKey) || 0;

      // Calculate status dynamically based on alerts and exit
      let status: string;
      if (!exit) {
        status = 'In Progress';
      } else if (violationCount > 0) {
        status = 'Alerted';
      } else {
        status = 'Clear';
      }

      aggregated.push({
        journeyId,
        licensePlate: entry.licensePlate,
        vehicleType: entry.vehicleType,
        entryPoint,
        exitPoint,
        transitTime: `${transitTimeMinutes} min`,
        dockingTime: `${totalDockingMinutes} min`,
        dwellTime: `${totalDwellMinutes} min`,
        alerts: violationCount,
        status,
      });
    }

    // Sort by most recent entry first and limit
    return aggregated
      .sort((a, b) => b.journeyId.localeCompare(a.journeyId))
      .slice(0, limit);
  }

  async getBottlenecks(limit = 10) {
    // Fetch all journey detections
    const detections = await this.journeyModel
      .find()
      .lean()
      .exec();

    // Fetch all cameras to get location names
    const cameras = await this.cameraModel.find().lean().exec();
    const cameraLocationMap = new Map<string, string>();
    cameras.forEach(c => {
      cameraLocationMap.set(c.cameraId, c.locationName);
      // Also handle different formats (CAM-001 vs cam_01)
      const normalized = c.cameraId.toLowerCase().replace('cam_', 'cam-').replace('-0', '-');
      cameraLocationMap.set(normalized, c.locationName);
      const reverse = c.cameraId.toUpperCase().replace('CAM_', 'CAM-').replace(/CAM-(\d)$/, 'CAM-0$1');
      cameraLocationMap.set(reverse, c.locationName);
    });

    // 🚀 OPTIMIZATION: Fetch all vehicle limits upfront to avoid N+1 problem
    const vehicleLimits = await this.vehicleConfigService.getAllVehicleLimits();

    // Group detections by cameraId
    const cameraMap = new Map<string, any[]>();
    for (const detection of detections) {
      const id = detection.cameraId;
      if (!cameraMap.has(id)) {
        cameraMap.set(id, []);
      }
      cameraMap.get(id)!.push(detection);
    }

    // Calculate bottleneck metrics for each camera
    const bottlenecks = [];
    for (const [cameraId, dets] of cameraMap.entries()) {
      // Calculate average dwell time
      const totalDwellMinutes = dets.reduce((sum, d) => sum + this.parseMinutesSafely(d.dwellTime), 0);
      const avgDwell = Math.round(totalDwellMinutes / dets.length);

      // Count unique journeys passing through this camera
      const uniqueJourneys = new Set(dets.map(d => d.journeyId)).size;

      // 🚀 OPTIMIZATION: Count delayed journeys using pre-fetched vehicle limits
      let delayedCount = 0;
      for (const det of dets) {
        const limit = vehicleLimits.get(det.vehicleType) || 40; // Default to 40 if not found
        if (this.parseMinutesSafely(det.dwellTime) > limit) {
          delayedCount++;
        }
      }

      // Determine severity based on average dwell time
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (avgDwell >= 20) severity = 'high';
      else if (avgDwell >= 15) severity = 'medium';

      // Get actual location name from camera data
      const zoneName = cameraLocationMap.get(cameraId) || `Zone ${cameraId}`;

      bottlenecks.push({
        zone: zoneName,
        camera: cameraId,
        avgDwell: `${avgDwell}m`,
        journeys: uniqueJourneys,
        delays: delayedCount,
        severity,
      });
    }

    // Sort by severity (high first) then by avg dwell time (descending)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return bottlenecks
      .sort((a, b) => {
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return parseInt(b.avgDwell) - parseInt(a.avgDwell);
      })
      .slice(0, limit);
  }

  async getJourneyDetails(journeyId: string) {
    // Fetch all detections for this journey
    const detections = await this.journeyModel
      .find({ journeyId })
      .sort({ detectionTime: 1 })
      .lean()
      .exec();

    if (detections.length === 0) {
      return null;
    }

    const firstDetection = detections[0];
    const entry = detections.find(d => d.type === 'entry');
    const exit = detections.find(d => d.type === 'exit');

    // Calculate time range for violation matching
    const startTime = entry?.detectionTime || detections[0].detectionTime;
    const endTime = exit?.detectionTime || new Date().toISOString();

    // Fetch violations for this license plate within the journey time range
    const violations = await this.violationModel
      .find({
        licensePlate: firstDetection.licensePlate,
        timestamp: {
          $gte: startTime,
          $lte: endTime,
        },
      })
      .sort({ timestamp: 1 })
      .lean()
      .exec();

    // Fetch all cameras to map camera IDs to location names
    const cameras = await this.cameraModel.find().lean().exec();

    // Create a map with normalized camera IDs (handle both CAM-001 and cam_01 formats)
    const cameraMap = new Map<string, string>();
    cameras.forEach(c => {
      cameraMap.set(c.cameraId, c.locationName);
      // Also add normalized version (CAM-001 -> cam_01)
      const normalized = c.cameraId.toLowerCase().replace('cam_', 'cam-').replace('-0', '-');
      cameraMap.set(normalized, c.locationName);
      // And the reverse (cam_01 -> CAM-001)
      const reverse = c.cameraId.toUpperCase().replace('CAM_', 'CAM-').replace(/CAM-(\d)$/, 'CAM-0$1');
      cameraMap.set(reverse, c.locationName);
    });

    // Build timeline from detections with actual location names
    const timeline = detections.map(detection => ({
      type: detection.type,
      cameraId: detection.cameraId,
      location: cameraMap.get(detection.cameraId) || `Zone ${detection.cameraId}`,
      detectionTime: detection.detectionTime,
      dwellTime: detection.dwellTime,
      dockingTime: detection.dockingTime,
    }));

    // Calculate summary metrics
    const totalDocking = detections.reduce((sum, d) => sum + this.parseMinutesSafely(d.dockingTime), 0);
    const totalDwell = detections.reduce((sum, d) => sum + this.parseMinutesSafely(d.dwellTime), 0);

    // Calculate transit time from entry to exit (or last detection)
    let transitTimeMinutes = 0;
    if (entry) {
      const lastDetection = exit || detections[detections.length - 1];
      const entryDate = new Date(entry.detectionTime);
      const lastDate = new Date(lastDetection.detectionTime);
      transitTimeMinutes = Math.round((lastDate.getTime() - entryDate.getTime()) / (1000 * 60));
    }

    // Calculate status dynamically
    let status: string;
    if (!exit) {
      status = 'In Progress';
    } else if (violations.length > 0) {
      status = 'Alerted';
    } else {
      status = 'Clear';
    }

    return {
      journeyId,
      licensePlate: firstDetection.licensePlate,
      vehicleType: firstDetection.vehicleType,
      status,
      summary: {
        transitTime: `${transitTimeMinutes} min`,
        dockingTime: `${totalDocking} min`,
        dwellTime: `${totalDwell} min`,
        alerts: violations.length,
      },
      timeline,
      violations: violations.map(v => ({
        violationType: v.violationType,
        location: v.location,
        severity: v.severity,
      })),
    };
  }


  private parseMinutesSafely(time: any): number {
    if (typeof time !== 'string') return 0;
    const match = time.match(/(\d+)\s*min/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private formatTime(isoTimestamp: string): string {
    try {
      const date = new Date(isoTimestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch {
      return '00:00:00';
    }
  }
}
