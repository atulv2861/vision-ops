import { Injectable, Logger } from '@nestjs/common';
import { ElasticService, UtilsService } from '../../libs/common';

@Injectable()
export class SpaceService {
    private readonly logger = new Logger(SpaceService.name);

    constructor(
        private readonly elasticService: ElasticService,
        private readonly utilsService: UtilsService,
    ) { }


    async getSpaceUtilization(
        client_id: string,
        location_id: string,
        from: string,
        to: string,
        camera_id?: string,
    ) {
        try {
            const client = this.elasticService.getClient();
            const cameraIndexName = this.elasticService.getCameraIndexName();
            const match_query = this.utilsService.createQuery(
                client_id,
                camera_id,
                location_id,
                from,
                to,
            );

            // Timestamp filter only if provided
            const filter = [];
            if (from && to) {
                filter.push({
                    range: {
                        timestamp: {
                            gte: from,
                            lte: to,
                        },
                    },
                });
            }

            const queryCheck = {
                bool: {
                    must: match_query,
                    filter: filter,
                },
            };
            this.logger.log(`Using index: ${cameraIndexName}`);
            this.logger.log(`Query body: ${JSON.stringify(queryCheck)}`);

            const response = await client.search({
                index: cameraIndexName,
                size: 0,
                query: queryCheck,
                aggs: {
                    by_location: {
                        terms: {
                            field: 'location', // Changed from location.keyword to match OverviewService
                            size: 100,
                            shard_size: 200,
                        },
                        aggs: {
                            latest_record: {
                                top_hits: {
                                    size: 1,
                                    sort: [{ timestamp: { order: 'desc' } }],
                                    _source: ['occupancy_capacity', 'total_person', 'location'],
                                },
                            },
                        },
                    },
                },
            });

            const buckets = (response.aggregations as any)?.by_location?.buckets || [];
            const results = buckets.map((bucket: any) => {
                const hit = bucket.latest_record.hits.hits[0]?._source;
                const location = hit?.location || bucket.key;
                const totalPerson = hit?.total_person || 0;
                const capacity = hit?.occupancy_capacity || 0;

                // Calculate percentage with safety check
                let percentage = 0;
                if (capacity > 0) {
                    percentage = Math.round((totalPerson / capacity) * 100);
                }

                return {
                    location: location,
                    value: percentage,
                };
            });

            return results;
        } catch (error) {
            this.logger.error('Error getting space utilization:', error);
            throw error;
        }
    }

    async getSpaceAnalytics(range: string) {
        try {
            const client = this.elasticService.getClient();
            const cameraIndexName = this.elasticService.getCameraIndexName();

            // 1. Calculate Time Range
            let gte = 'now/d'; // default today
            if (range === '7d') gte = 'now-7d/d';
            if (range === '30d') gte = 'now-30d/d';

            const query = {
                bool: {
                    must: [{ match_all: {} }],
                    filter: [
                        {
                            range: {
                                timestamp: {
                                    gte: gte,
                                    lte: 'now',
                                },
                            },
                        },
                    ],
                },
            };

            const response = await client.search({
                index: cameraIndexName,
                size: 0,
                query: query,
                aggs: {
                    // 1. Average Occupancy: We need the global average (sum of people / sum of capacity) * 100
                    // But usually, "average occupancy" means average percentage over time.
                    // Approach: Average of (total_person / occupancy_capacity) for each record.
                    average_occupancy_percentage: {
                        avg: {
                            script: {
                                source: "if (doc['occupancy_capacity'].value > 0) { return (doc['total_person'].value / (double)doc['occupancy_capacity'].value) * 100.0 } else { return 0 }"
                            }
                        }
                    },
                    // 2. Peak Occupancy: Find record with max total_person
                    peak_occupancy_record: {
                        top_hits: {
                            sort: [{ total_person: { order: 'desc' } }],
                            size: 1,
                            _source: ['total_person', 'location', 'timestamp', 'occupancy_capacity']
                        }
                    },
                    // 3. Underutilized & 4. Current Presence context
                    by_location: {
                        terms: { field: 'location', size: 100 },
                        aggs: {
                            // For Underutilized: Average occupancy for this location
                            avg_occupancy: {
                                avg: {
                                    script: {
                                        source: "if (doc['occupancy_capacity'].value > 0) { return (doc['total_person'].value / (double)doc['occupancy_capacity'].value) * 100.0 } else { return 0 }"
                                    }
                                }
                            },
                            // For Current Presence: Latest record
                            latest_record: {
                                top_hits: {
                                    sort: [{ timestamp: { order: 'desc' } }],
                                    size: 1,
                                    _source: ['total_person', 'location', 'timestamp']
                                }
                            }
                        }
                    }
                }
            });

            const aggs = response.aggregations as any;
            const totalDocs = response.hits.total instanceof Object ? response.hits.total.value : response.hits.total;

            if (totalDocs === 0) {
                return {
                    success: true,
                    range: range,
                    data_available: false,
                    metrics: [
                        {
                            title: "Average Occupancy",
                            value: "0%",
                            subtitle: "across all spaces"
                        },
                        {
                            title: "Peak Occupancy Time",
                            value: "N/A",
                            subtitle: "N/A"
                        },
                        {
                            title: "Underutilized Spaces",
                            value: "0",
                            subtitle: "0% of total"
                        },
                        {
                            title: "Current Presence",
                            value: "0",
                            subtitle: "in N/A"
                        }
                    ]
                };
            }

            // 1. Average Occupancy
            const avgOccupancyVal = aggs.average_occupancy_percentage?.value || 0;

            // 2. Peak Occupancy
            const peakHit = aggs.peak_occupancy_record?.hits?.hits?.[0]?._source;
            const peakTime = peakHit?.timestamp ? new Date(peakHit.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const peakLocation = peakHit?.location || 'N/A';

            // 3. Underutilized Spaces
            const buckets = aggs.by_location?.buckets || [];
            let underutilizedCount = 0;
            const underutilizedThreshold = 10; // 10%

            // 4. Current Presence
            let maxCurrentPresence = 0;
            let maxCurrentPresenceLocation = 'N/A';

            buckets.forEach((bucket: any) => {
                // Check underutilized
                if (bucket.avg_occupancy?.value < underutilizedThreshold) {
                    underutilizedCount++;
                }

                // Check current presence
                const latest = bucket.latest_record?.hits?.hits?.[0]?._source;
                if (latest) {
                    const presence = latest.total_person || 0;
                    if (presence > maxCurrentPresence) {
                        maxCurrentPresence = presence;
                        maxCurrentPresenceLocation = latest.location;
                    }
                }
            });

            const totalLocations = buckets.length;
            const underutilizedPercentage = totalLocations > 0 ? Math.round((underutilizedCount / totalLocations) * 100) : 0;

            return {
                success: true,
                range: range,
                data_available: true,
                metrics: [
                    {
                        title: "Average Occupancy",
                        value: `${Math.round(avgOccupancyVal)}%`,
                        subtitle: "across all spaces"
                    },
                    {
                        title: "Peak Occupancy Time",
                        value: peakTime,
                        subtitle: peakLocation
                    },
                    {
                        title: "Underutilized Spaces",
                        value: underutilizedCount.toString(),
                        subtitle: `${underutilizedPercentage}% of total`
                    },
                    {
                        title: "Current Presence",
                        value: maxCurrentPresence.toString(),
                        subtitle: `in ${maxCurrentPresenceLocation}`
                    }
                ]
            };

        } catch (error) {
            this.logger.error('Error getting space analytics:', error);
            throw error;
        }
    }

    async getOccupancyComparison(client_id: string, location_id: string, camera_id?: string) {
        try {
            const client = this.elasticService.getClient();
            const cameraIndexName = this.elasticService.getCameraIndexName();

            // Base match query (client, location, camera) - NO date range here yet
            // We use match_all if no specific filters, but usually client/location are required? 
            // The method signature allows them.
            // Re-using utilsService.createQuery might be tricky because it adds a date range.
            // Let's build the base bool structure manually or use createQuery with broad range?
            // Actually, utilsService.createQuery takes (client_id, camera_id, location_id, from, to).
            // We can reuse it for each query with specific dates.

            // 1. Historical Data Query (30 days ago to yesterday)
            // Range: now-30d/d to now/d (lt now/d excludes today)
            // Note: utilsService.createQuery handles "from" and "to". 
            // If from/to are 'now-30d/d' and 'now/d', it generates range query.

            const historicalFrom = 'now-30d/d';
            const historicalTo = 'now/d'; // CreateQuery usually uses lte. We need to be careful.

            // Let's build queries manually to ensure strict control over range (lt vs lte)
            const baseMust: any[] = [];
            if (client_id) baseMust.push({ match: { client_id } });
            if (location_id) baseMust.push({ match: { location_id } });
            if (camera_id) baseMust.push({ match: { camera_id } });

            const historicalQuery = {
                bool: {
                    must: [...baseMust],
                    filter: [
                        {
                            range: {
                                timestamp: {
                                    gte: historicalFrom,
                                    lt: historicalTo, // Strictly less than start of today
                                },
                            },
                        },
                    ],
                },
            };

            const historicalResponse = await client.search({
                index: cameraIndexName,
                size: 0,
                query: historicalQuery,
                aggs: {
                    by_hour: {
                        date_histogram: {
                            field: 'timestamp',
                            fixed_interval: '1h',
                            format: 'H' // Returns 0-23
                        },
                        aggs: {
                            sum_people: { sum: { field: 'total_person' } },
                            count_readings: { value_count: { field: 'total_person' } }
                        }
                    }
                }
            });

            // Process Historical Data
            const expectedMap = new Map<number, number>();
            // We need to aggregate across all days for each hour. 
            // The date_histogram gives us buckets like "2026-02-01 08:00", "2026-02-01 09:00"...
            // But we requested format 'H', so the key_as_string will be '8', '9'. 
            // HOWEVER, date_histogram creates a bucket per interval. Even with format 'H', 
            // it produces many buckets (one for each hour of each day).
            // Wait, format 'H' affects key_as_string, but the buckets are still separated by time.
            // So we will have multiple buckets with key_as_string="8" (one for each day).
            // We need to aggregate them in Node.js.

            const historicalAggs = new Map<number, { sum: number; count: number }>();

            const historicalBuckets = (historicalResponse.aggregations as any)?.by_hour?.buckets || [];

            historicalBuckets.forEach((bucket: any) => {
                const hour = parseInt(bucket.key_as_string, 10); // "8", "9", etc.
                // Depending on timezone, this might be tricky. Elasticsearch returns UTC by default usually 
                // unless timezone is specified. Assuming data and system are aligned or UTC is fine.
                // Ideally we should pass time_zone to date_histogram if user wants local time.
                // unique_count or total_count?
                const sum = bucket.sum_people.value;
                const count = bucket.count_readings.value;

                if (!historicalAggs.has(hour)) {
                    historicalAggs.set(hour, { sum: 0, count: 0 });
                }
                const current = historicalAggs.get(hour);
                if (current) {
                    current.sum += sum;
                    current.count += count;
                }
            });

            // Calculate Expected (Weighted Average)
            historicalAggs.forEach((val, hour) => {
                const avg = val.count > 0 ? Math.round(val.sum / val.count) : 0;
                expectedMap.set(hour, avg);
            });


            // 2. Actual Data Query (Today)
            const actualFrom = 'now/d';
            const actualTo = 'now';

            const actualQuery = {
                bool: {
                    must: [...baseMust],
                    filter: [
                        {
                            range: {
                                timestamp: {
                                    gte: actualFrom,
                                    lte: actualTo,
                                },
                            },
                        },
                    ],
                },
            };

            const actualResponse = await client.search({
                index: cameraIndexName,
                size: 0,
                query: actualQuery,
                aggs: {
                    by_hour: {
                        date_histogram: {
                            field: 'timestamp',
                            fixed_interval: '1h',
                            format: 'H'
                        },
                        aggs: {
                            avg_people: { avg: { field: 'total_person' } }
                        }
                    }
                }
            });

            const actualMap = new Map<number, number>();
            const actualBuckets = (actualResponse.aggregations as any)?.by_hour?.buckets || [];

            actualBuckets.forEach((bucket: any) => {
                const hour = parseInt(bucket.key_as_string, 10);
                const val = bucket.avg_people.value || 0;
                actualMap.set(hour, Math.round(val));
            });

            // 3. Construct Response (Fixed 24 hours)
            const response = [];
            for (let i = 0; i < 24; i++) {
                // Format time: 0 -> 12AM, 12 -> 12PM, 23 -> 11PM
                const ampm = i >= 12 ? 'PM' : 'AM';
                const hour12 = i % 12 || 12;
                const timeLabel = `${hour12}${ampm}`;

                response.push({
                    time: timeLabel,
                    actual_occupancy: actualMap.get(i) || 0,
                    expected_occupancy: expectedMap.get(i) || 0
                });
            }

            return response;

        } catch (error) {
            this.logger.error('Error getting occupancy comparison:', error);
            throw error;
        }
    }

}
