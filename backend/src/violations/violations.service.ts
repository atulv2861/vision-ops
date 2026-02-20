import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Violation, ViolationDocument } from './schemas/violation.schema';
import { CreateViolationDto } from './dto/create-violation.dto';
import { UpdateViolationDto } from './dto/update-violation.dto';
import { QueryViolationDto } from './dto/query-violation.dto';

import { ElasticService } from '@app/common';

@Injectable()
export class ViolationsService {
  constructor(
    @InjectModel(Violation.name)
    private violationModel: Model<ViolationDocument>,
    private readonly elasticService: ElasticService,
  ) { }

  async create(dto: CreateViolationDto): Promise<ViolationDocument> {
    const created = new this.violationModel(dto);
    return created.save();
  }

  async createBulk(dtos: CreateViolationDto[]): Promise<{ created: number }> {
    if (dtos.length === 0) return { created: 0 };
    await this.violationModel.insertMany(dtos);
    return { created: dtos.length };
  }

  async findAll(query: QueryViolationDto): Promise<{
    data: ViolationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { date, hour, location, violationType, severity, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = {};
    if (date) filter.date = date;
    if (hour !== undefined) filter.hour = hour;
    if (location) filter.location = location;
    if (violationType) filter.violationType = violationType;
    if (severity) filter.severity = severity;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.violationModel.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean().exec(),
      this.violationModel.countDocuments(filter),
    ]);
    return {
      data: data as unknown as ViolationDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ViolationDocument> {
    const doc = await this.violationModel.findOne({ id }).lean().exec();
    if (!doc) throw new NotFoundException(`Violation with id "${id}" not found`);
    return doc as unknown as ViolationDocument;
  }

  async update(id: string, dto: UpdateViolationDto): Promise<ViolationDocument> {
    const updated = await this.violationModel
      .findOneAndUpdate({ id }, { $set: dto }, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException(`Violation with id "${id}" not found`);

    // Sync to Elasticsearch
    // We fetch the full document to ensure complete data is indexed
    // Alternatively, we could just update the specific fields if strict partial update is supported and desired
    // But re-indexing the full document is safer and simpler here
    try {
      await this.elasticService.indexDocument('traffic_violations', id, {
        ...updated,
        // Ensure ID uses the custom string ID, not MongoDB's ObjectId
        id: updated.id,
        // Remove MongoDB internal fields
        _id: undefined,
        __v: undefined
      });
    } catch (error) {
      // Log error but don't fail the request - consistency can be reconciled later
      console.error(`Failed to sync update for violation ${id} to Elasticsearch:`, error);
    }

    return updated as unknown as ViolationDocument;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.violationModel.deleteOne({ id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`Violation with id "${id}" not found`);
    return { deleted: true };
  }

  /** Overview aggregations for the dashboard */
  async getOverview(dateFilter?: string): Promise<{
    stats: {
      totalViolations: number;
      violationsToday: number;
      highSeverityCount: number;
      repeatOffendersCount: number;
      activeCamerasCount: number;
    };
    byHour: { hour: number; count: number }[];
    byDayOfWeek: { dayOfWeek: string; count: number }[];
    byType: { violationType: string; count: number }[];
    topLocations: { name: string; count: number; highCount: number }[];
    repeatOffenders: { licensePlate: string; count: number; lastDate: string }[];
    peakTimeHeatmap: { dayOfWeek: string; hour: number; count: number }[];
  }> {
    const today = dateFilter || new Date().toISOString().slice(0, 10);
    const baseMatch = dateFilter ? { date: dateFilter } : {};
    const todayMatch = { date: today };

    const [
      totalViolations,
      violationsToday,
      highSeverityCount,
      activeCamerasCount,
      byHour,
      byDayOfWeek,
      byType,
      topLocations,
      repeatOffendersAgg,
      peakTimeHeatmap,
    ] = await Promise.all([
      this.violationModel.countDocuments(baseMatch),
      this.violationModel.countDocuments(todayMatch),
      this.violationModel.countDocuments({ ...baseMatch, severity: 'high' }),
      this.violationModel.distinct('cameraId', baseMatch).then((arr) => arr.length),
      this.violationModel.aggregate([
        { $match: dateFilter ? { date: dateFilter } : {} },
        { $group: { _id: '$hour', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { hour: '$_id', count: 1, _id: 0 } },
      ]),
      this.violationModel.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$dayOfWeek', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { dayOfWeek: '$_id', count: 1, _id: 0 } },
      ]),
      this.violationModel.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$violationType', count: { $sum: 1 } } },
        { $project: { violationType: '$_id', count: 1, _id: 0 } },
      ]),
      this.violationModel.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$location',
            count: { $sum: 1 },
            highCount: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { name: '$_id', count: 1, highCount: 1, _id: 0 } },
      ]),
      this.violationModel.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$licensePlate', count: { $sum: 1 }, lastDate: { $max: '$date' } } },
        { $match: { count: { $gte: 2 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { licensePlate: '$_id', count: 1, lastDate: 1, _id: 0 } },
      ]),
      this.violationModel.aggregate([
        { $match: baseMatch },
        { $group: { _id: { dayOfWeek: '$dayOfWeek', hour: '$hour' }, count: { $sum: 1 } } },
        {
          $project: {
            dayOfWeek: '$_id.dayOfWeek',
            hour: '$_id.hour',
            count: 1,
            _id: 0,
          },
        },
      ]),
    ]);

    const repeatOffendersCount = await this.violationModel.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$licensePlate', count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
      { $count: 'total' },
    ]).then((r) => r[0]?.total ?? 0);

    return {
      stats: {
        totalViolations,
        violationsToday,
        highSeverityCount,
        repeatOffendersCount,
        activeCamerasCount,
      },
      byHour,
      byDayOfWeek,
      byType,
      topLocations,
      repeatOffenders: repeatOffendersAgg,
      peakTimeHeatmap,
    };
  }
}
