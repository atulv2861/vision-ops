import { Injectable, Logger } from '@nestjs/common';
import { ElasticService } from './elastic.service';

export interface SearchViolationsFilters {
    page?: number;
    limit?: number;
    severity?: string[];
    violationType?: string[];
    status?: string[];
    location?: string;
    dateFrom?: Date;
    dateTo?: Date;
    cameraId?: string;
}

export interface ViolationAggregations {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    byHour: Array<{ hour: number; count: number }>;
    byLocation: Array<{ location: string; count: number }>;
    topCameras: Array<{ cameraId: string; count: number }>;
}

export interface DashboardOverview {
    stats: {
        totalViolations: number;
        violationsToday: number;
        highSeverityCount: number;
        repeatOffendersCount: number;
        activeCamerasCount: number;
    };
    byHour: Array<{ hour: number; count: number }>;
    byDayOfWeek: Array<{ dayOfWeek: string; count: number }>;
    byDate: Array<{ date: string; count: number }>;
    byType: Array<{ violationType: string; count: number }>;
    topLocations: Array<{ name: string; count: number; highCount: number }>;
    repeatOffenders: Array<{ vehicleNo: string; count: number; lastDate: string }>;
    peakTimeHeatmap: Array<{ dayOfWeek: string; hour: number; count: number }>;
}

@Injectable()
export class ElasticsearchQueryService {
    private readonly logger = new Logger(ElasticsearchQueryService.name);

    constructor(private readonly elasticService: ElasticService) { }

    /**
     * Convert timezone offset in minutes to Elasticsearch timezone string format
     * @param offsetMinutes - Timezone offset in minutes (negative for ahead of UTC)
     * @returns Timezone string in format like "+05:30" or "-08:00"
     */
    private getTimezoneString(offsetMinutes: number): string {
        // offsetMinutes is negative for timezones ahead of UTC (e.g., -330 for IST)
        // We need to invert it for the timezone string
        const totalMinutes = -offsetMinutes;
        const sign = totalMinutes >= 0 ? '+' : '-';
        const absMinutes = Math.abs(totalMinutes);
        const hours = Math.floor(absMinutes / 60);
        const minutes = absMinutes % 60;
        return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    /**
     * Search violations with filters using Elasticsearch
     */
    async searchViolations(filters: SearchViolationsFilters = {}) {
        const client = this.elasticService.getClient();
        if (!client) {
            throw new Error('Elasticsearch not connected');
        }

        const {
            page = 1,
            limit = 100,
            severity,
            violationType,
            status,
            location,
            dateFrom,
            dateTo,
            cameraId,
        } = filters;

        // Build query
        const must: any[] = [];
        const filter: any[] = [];

        // Full-text search on location with partial matching support
        if (location) {
            must.push({
                bool: {
                    should: [
                        // Exact match gets highest score
                        {
                            match: {
                                location: {
                                    query: location,
                                    boost: 2,
                                },
                            },
                        },
                        // Wildcard for partial matching
                        {
                            wildcard: {
                                location: {
                                    value: `*${location.toLowerCase()}*`,
                                    case_insensitive: true,
                                },
                            },
                        },
                    ],
                    minimum_should_match: 1,
                },
            });
        }

        // Filter by severity
        if (severity && severity.length > 0) {
            filter.push({
                terms: { severity: severity },
            });
        }

        // Filter by violation type
        if (violationType && violationType.length > 0) {
            filter.push({
                terms: { violationType: violationType },
            });
        }

        // Filter by status
        if (status && status.length > 0) {
            filter.push({
                terms: { status: status },
            });
        }

        // Filter by camera
        if (cameraId) {
            filter.push({
                term: { cameraId: cameraId },
            });
        }

        // Filter by date range
        if (dateFrom || dateTo) {
            const range: any = {};
            if (dateFrom) range.gte = dateFrom.toISOString();
            if (dateTo) range.lte = dateTo.toISOString();
            filter.push({
                range: { timestamp: range },
            });
        }

        try {
            const result = await client.search({
                index: 'traffic_violations',
                body: {
                    query: {
                        bool: {
                            must: must.length > 0 ? must : [{ match_all: {} }],
                            filter,
                        },
                    },
                    from: (page - 1) * limit,
                    size: limit,
                    sort: [{ timestamp: 'desc' }],
                },
            });

            const total = typeof result.hits.total === 'number'
                ? result.hits.total
                : result.hits.total?.value || 0;

            return {
                data: result.hits.hits.map((hit: any) => hit._source),
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error('Failed to search violations:', error.message);
            throw error;
        }
    }

    /**
     * Get violation aggregations for dashboard
     */
    async getViolationAggregations(
        dateFrom?: Date,
        dateTo?: Date,
    ): Promise<ViolationAggregations> {
        const client = this.elasticService.getClient();
        if (!client) {
            throw new Error('Elasticsearch not connected');
        }

        // Build date range filter
        const filter: any[] = [];
        if (dateFrom || dateTo) {
            const range: any = {};
            if (dateFrom) range.gte = dateFrom.toISOString();
            if (dateTo) range.lte = dateTo.toISOString();
            filter.push({
                range: { timestamp: range },
            });
        }

        try {
            const result = await client.search({
                index: 'traffic_violations',
                body: {
                    size: 0,
                    query: filter.length > 0 ? { bool: { filter } } : { match_all: {} },
                    aggs: {
                        by_severity: {
                            terms: { field: 'severity.keyword', size: 10 },
                        },
                        by_type: {
                            terms: { field: 'violationType.keyword', size: 20 },
                        },
                        by_hour: {
                            terms: { field: 'hour', size: 24 },
                        },
                        by_location: {
                            terms: { field: 'location.keyword', size: 10 },
                        },
                        top_cameras: {
                            terms: { field: 'cameraId.keyword', size: 10 },
                        },
                    },
                },
            });

            // Parse aggregations
            const aggs = result.aggregations;

            const total = typeof result.hits.total === 'number'
                ? result.hits.total
                : result.hits.total?.value || 0;

            // Convert aggregations to proper format
            const bySeverity: Record<string, number> = {};
            this.parseTermsAgg(aggs.by_severity).forEach((item: any) => {
                bySeverity[item.key] = item.count;
            });

            const byType: Record<string, number> = {};
            this.parseTermsAgg(aggs.by_type).forEach((item: any) => {
                byType[item.key] = item.count;
            });

            return {
                total,
                bySeverity,
                byType,
                byHour: this.parseTermsAgg(aggs.by_hour).map((item: any) => ({
                    hour: parseInt(item.key),
                    count: item.count,
                })),
                byLocation: this.parseTermsAgg(aggs.by_location).map((item: any) => ({
                    location: item.key,
                    count: item.count,
                })),
                topCameras: this.parseTermsAgg(aggs.top_cameras).map((item: any) => ({
                    cameraId: item.key,
                    count: item.count,
                })),
            };
        } catch (error) {
            this.logger.error('Failed to get aggregations:', error.message);
            throw error;
        }
    }

    /**
     * Get comprehensive dashboard overview using Elasticsearch
     */
    async getDashboardOverview(startDate?: string, endDate?: string, timezoneOffsetMinutes: number = 0): Promise<DashboardOverview> {
        const client = this.elasticService.getClient();
        if (!client) {
            throw new Error('Elasticsearch not connected');
        }

        try {
            // Build date filters for range
            const today = new Date().toISOString().slice(0, 10);
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);

            // Base filter for optional date range filtering
            const baseFilter: any[] = [];
            if (startDate || endDate) {
                // console.log('[DEBUG] Date filter params:', { startDate, endDate, timezoneOffsetMinutes });
                const dateRange: any = {};
                if (startDate) {
                    // Parse date in user's timezone
                    // timezoneOffset is in minutes, negative for timezones ahead of UTC
                    // For IST (UTC+5:30), offset is -330
                    const [year, month, day] = startDate.split('-').map(Number);
                    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                    // Adjust for user's timezone: subtract the offset to get UTC time
                    start.setMinutes(start.getMinutes() + timezoneOffsetMinutes);
                    dateRange.gte = start.toISOString();
                    console.log('[DEBUG] Start date ISO:', dateRange.gte);
                }
                if (endDate) {
                    // Parse date in user's timezone
                    const [year, month, day] = endDate.split('-').map(Number);
                    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
                    // Adjust for user's timezone: subtract the offset to get UTC time
                    end.setMinutes(end.getMinutes() + timezoneOffsetMinutes);
                    dateRange.lte = end.toISOString();
                    console.log('[DEBUG] End date ISO:', dateRange.lte);
                }
                baseFilter.push({
                    range: { timestamp: dateRange }
                });
                console.log('[DEBUG] Date range filter:', JSON.stringify(baseFilter, null, 2));
            }

            // Query for all violations (with optional date range filter)
            const allQuery = baseFilter.length > 0 ? { bool: { filter: baseFilter } } : { match_all: {} };

            // Query for today's violations
            const todayQuery = {
                bool: {
                    filter: [
                        {
                            range: {
                                timestamp: {
                                    gte: todayStart.toISOString(),
                                    lte: todayEnd.toISOString(),
                                },
                            },
                        },
                    ],
                },
            };

            // Main aggregation query
            const result = await client.search({
                index: 'traffic_violations',
                body: {
                    size: 0,
                    query: allQuery,
                    aggs: {
                        by_hour: {
                            terms: { field: 'hour', size: 24 },
                        },
                        by_day_of_week: {
                            terms: { field: 'dayOfWeek', size: 7 },
                        },
                        by_date: {
                            date_histogram: {
                                field: 'timestamp',
                                calendar_interval: 'day',
                                time_zone: this.getTimezoneString(timezoneOffsetMinutes),
                                format: 'yyyy-MM-dd',
                                order: { _key: 'desc' }
                            }
                        },
                        by_type: {
                            terms: { field: 'violationType', size: 20 },
                        },
                        by_location: {
                            terms: { field: 'location.keyword', size: 10 },
                            aggs: {
                                high_severity: {
                                    filter: { term: { severity: 'high' } },
                                },
                            },
                        },
                        high_severity: {
                            filter: { term: { severity: 'high' } },
                        },
                        active_cameras: {
                            cardinality: { field: 'cameraId' },
                        },
                        repeat_offenders: {
                            terms: {
                                field: 'licensePlate',
                                size: 10,
                                min_doc_count: 2,
                            },
                            aggs: {
                                last_date: {
                                    max: { field: 'timestamp' },
                                },
                            },
                        },
                        peak_time_heatmap: {
                            composite: {
                                size: 200,
                                sources: [
                                    { day: { terms: { field: 'dayOfWeek' } } },
                                    { hour: { terms: { field: 'hour' } } },
                                ],
                            },
                        },
                    },
                },
            });

            // Query for today's count
            const todayResult = await client.count({
                index: 'traffic_violations',
                body: { query: todayQuery },
            });

            // Query for repeat offenders count
            const repeatOffendersCountResult = await client.search({
                index: 'traffic_violations',
                body: {
                    size: 0,
                    query: allQuery,
                    aggs: {
                        unique_vehicles: {
                            terms: {
                                field: 'licensePlate',
                                min_doc_count: 2,
                            },
                        },
                    },
                },
            });

            // Parse results
            const aggs = result.aggregations;
            const total = typeof result.hits.total === 'number'
                ? result.hits.total
                : result.hits.total?.value || 0;

            const violationsToday = todayResult.count || 0;
            const highSeverityCount = (aggs.high_severity as any)?.doc_count || 0;
            const activeCamerasCount = (aggs.active_cameras as any)?.value || 0;
            const repeatOffendersCount = (aggs.repeat_offenders as any)?.buckets?.length || 0;

            // Parse aggregations
            const byHour = this.parseTermsAgg(aggs.by_hour)
                .map((item: any) => ({
                    hour: parseInt(item.key),
                    count: item.count,
                }))
                .sort((a, b) => a.hour - b.hour);

            const byDayOfWeek = this.parseTermsAgg(aggs.by_day_of_week).map((item: any) => ({
                dayOfWeek: item.key,
                count: item.count,
            }));

            const byDate = ((aggs.by_date as any)?.buckets || [])
                .map((bucket: any) => ({
                    date: bucket.key_as_string || bucket.key,
                    count: bucket.doc_count,
                }))
                .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

            const byType = this.parseTermsAgg(aggs.by_type).map((item: any) => ({
                violationType: item.key,
                count: item.count,
            }));

            const topLocations = (aggs.by_location as any)?.buckets?.map((bucket: any) => ({
                name: bucket.key,
                count: bucket.doc_count,
                highCount: bucket.high_severity?.doc_count || 0,
            })) || [];

            const repeatOffenders = (aggs.repeat_offenders as any)?.buckets?.map((bucket: any) => ({
                vehicleNo: bucket.key, // API keeps vehicleNo; value is from licensePlate
                count: bucket.doc_count,
                lastDate: bucket.last_date?.value_as_string || bucket.last_date?.value || '',
            })) || [];

            const peakTimeHeatmap = (aggs.peak_time_heatmap as any)?.buckets?.map((bucket: any) => ({
                dayOfWeek: bucket.key.day,
                hour: parseInt(bucket.key.hour),
                count: bucket.doc_count,
            })) || [];

            return {
                stats: {
                    totalViolations: total,
                    violationsToday,
                    highSeverityCount,
                    repeatOffendersCount,
                    activeCamerasCount,
                },
                byHour,
                byDayOfWeek,
                byDate,
                byType,
                topLocations,
                repeatOffenders,
                peakTimeHeatmap,
            };
        } catch (error) {
            this.logger.error('Failed to get dashboard overview:', error.message);
            throw error;
        }
    }

    /**
     * Parse Elasticsearch terms aggregation
     */
    private parseTermsAgg(agg: any): any[] {
        if (!agg || !agg.buckets) return [];
        return agg.buckets.map((bucket: any) => ({
            key: bucket.key,
            count: bucket.doc_count,
        }));
    }
}
