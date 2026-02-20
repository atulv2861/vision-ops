import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FlowZone, FlowZoneDocument } from './schemas/flow-zone.schema';
import { FlowAlert, FlowAlertDocument } from './schemas/flow-alert.schema';
import { CongestionTimeseries, CongestionTimeseriesDocument } from './schemas/congestion-timeseries.schema';

@Injectable()
export class FlowService {
  constructor(
    @InjectModel(FlowZone.name) private flowZoneModel: Model<FlowZoneDocument>,
    @InjectModel(FlowAlert.name) private flowAlertModel: Model<FlowAlertDocument>,
    @InjectModel(CongestionTimeseries.name) private congestionModel: Model<CongestionTimeseriesDocument>,
  ) { }

  async getAllFlowData() {
    const [zones, alerts, congestion] = await Promise.all([
      this.flowZoneModel.find().sort({ zoneName: 1 }).lean().exec(),
      this.flowAlertModel.find().sort({ name: 1 }).lean().exec(),
      this.congestionModel.find().sort({ name: 1 }).lean().exec(),
    ]);

    // Compute vehicle type distribution from zones
    const vehicleTypeCounts = new Map<string, number>();
    zones.forEach(zone => {
      const current = vehicleTypeCounts.get(zone.dominantVehicle) || 0;
      vehicleTypeCounts.set(zone.dominantVehicle, current + zone.vehicleCount);
    });

    const labels = Array.from(vehicleTypeCounts.keys());
    const values = Array.from(vehicleTypeCounts.values());

    return {
      zones,
      alerts,
      congestion,
      queue: [], // Not stored in DB - compute client-side
      vehicle_types: { labels, values },
    };
  }


  async getFlowZones() {
    return this.flowZoneModel.find().sort({ zoneName: 1 }).lean().exec();
  }

  async getFlowAlerts() {
    return this.flowAlertModel.find().sort({ name: 1 }).lean().exec();
  }

  async getCongestionTimeseries() {
    return this.congestionModel.find().sort({ name: 1 }).lean().exec();
  }
}
