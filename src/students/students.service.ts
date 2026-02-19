import { Injectable, Logger } from '@nestjs/common';
import { ElasticService, UtilsService } from '../../libs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StudentsService {
    private readonly logger = new Logger(StudentsService.name);

    constructor(
        private readonly elasticService: ElasticService,
        private readonly utilsService: UtilsService,
    ) { }

    /** Max buckets for terms agg so we return every person_type in the index. */
    private static readonly TERMS_AGG_SIZE_MAX = 65535;

    /**
     * Get Student KPI Summary
     * Calculates:
     * 1. Total Unique Students Today
     * 2. Average Dwell Time Today
     * 3. Peak Occupancy Today
     */
    async getSummary(
        client_id: string,
        from: string,
        to: string,
        camera_ids?: string[]) {
        try {
            const client = this.elasticService.getClient();
            const cameraIndexName = this.elasticService.getCameraIndexName();
            const match_query = this.utilsService.createQuery(client_id, camera_ids, from, to);

            // Default filters to ensure we are looking at specific data if needed.
            // Ensure we are filtering for "Today" (from 00:00:00 to Now)
            const dateFilter = (from && to) ? [] : [
                {
                    range: {
                        timestamp: {
                            gte: "now/d", // Start of the day
                            lte: "now"    // Up to current moment
                        }
                    }
                }
            ];

            const response = await client.search({
                index: cameraIndexName,
                size: 0,
                query: {
                    bool: {
                        must: match_query,
                        filter: [
                            ...dateFilter
                        ]
                    },
                },
                aggs: {
                    // KPI 1, 3, 4: Total Unique, Avg Dwell, Max Dwell
                    students_stats: {
                        nested: { path: 'person_data' },
                        aggs: {
                            filter_students: {
                                filter: { term: { 'person_data.person_type': 'student' } },
                                aggs: {
                                    total_unique: {
                                        cardinality: {
                                            field: 'person_data.person_id.keyword'
                                        }
                                    },
                                    avg_dwell: {
                                        avg: {
                                            field: 'person_data.dwell_time'
                                        }
                                    },
                                    max_dwell: {
                                        max: {
                                            field: 'person_data.dwell_time'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    // KPI 2: Peak Today (time-based)
                    occupancy_over_time: {
                        date_histogram: {
                            field: 'timestamp',
                            fixed_interval: '30m' // Granularity for peak detection
                        },
                        aggs: {
                            students_in_bucket: {
                                nested: { path: 'person_data' },
                                aggs: {
                                    filter_students: {
                                        filter: { term: { 'person_data.person_type': 'student' } },
                                        aggs: {
                                            count: { cardinality: { field: 'person_data.person_id.keyword' } }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    peak_occupancy_bucket: {
                        max_bucket: {
                            buckets_path: 'occupancy_over_time>students_in_bucket>filter_students>count'
                        }
                    }
                },
            });

            // Extract Metrics
            const studentStats = (response.aggregations as any)?.students_stats?.filter_students;
            const totalStudents = studentStats?.total_unique?.value || 0;
            const avgDwellTime = studentStats?.avg_dwell?.value || 0;
            const maxDwellTime = studentStats?.max_dwell?.value || 0;

            // Peak Time Logic
            const peakValue = (response.aggregations as any)?.peak_occupancy_bucket?.value || 0;
            const peakKeys = (response.aggregations as any)?.peak_occupancy_bucket?.keys || [];
            let peakTimeLabel = 'today';

            if (peakKeys.length > 0) {
                // Convert timestamp to time string "11:00 AM"
                const date = new Date(peakKeys[0]);
                peakTimeLabel = `at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
            }

            // Format Cards
            return [
                {
                    id: randomUUID(),
                    title: 'Current Presence',
                    value: totalStudents.toString(),
                    subtitle: 'students across location',

                },
                {
                    id: randomUUID(),
                    title: 'Peak Today',
                    value: Math.round(peakValue).toString(),
                    subtitle: peakTimeLabel,

                },
                {
                    id: randomUUID(),
                    title: 'Avg Dwell Time',
                    value: `${Math.round(avgDwellTime)} min`,
                    subtitle: 'per student',

                },
                {
                    id: randomUUID(),
                    title: 'Peak Dwell Time',
                    value: `${Math.round(maxDwellTime)} min`,
                    subtitle: 'maximum today',

                }
            ];

        } catch (error) {
            this.logger.error('Error getting summary:', error);
            throw error;
        }
    }

    async getHourlyPresence(
        client_id: string,
        from: string,
        to: string,
        camera_ids?: string[]) {
        try {
            const client = this.elasticService.getClient();
            const cameraIndexName = this.elasticService.getCameraIndexName();
            const match_query = this.utilsService.createQuery(client_id, camera_ids, from, to);

            // Default filters to ensure we are looking at specific data if needed.
            // If from/to are provided, respect them. Otherwise default to "now-7d" for demo data availability.
            const dateFilter = [];
            if (from && to) {
                dateFilter.push({
                    range: {
                        timestamp: {
                            gte: from,
                            lte: to
                        }
                    }
                });
            } else {
                dateFilter.push({
                    range: {
                        timestamp: {
                            gte: "now/d",
                            lte: "now"
                        }
                    }
                });
            }

            const response = await client.search({
                index: cameraIndexName,
                size: 0,
                query: {
                    bool: {
                        must: match_query,
                        filter: [
                            ...dateFilter
                        ]
                    },
                },
                aggs: {
                    hourly_presence: {
                        date_histogram: {
                            field: 'timestamp',
                            calendar_interval: '1h',
                            time_zone: '+05:30', // adjusting to IST as per user context
                            min_doc_count: 0, // ensure empty buckets are returned
                            extended_bounds: {
                                min: from || "now/d",
                                max: to || "now"
                            }
                        },
                        aggs: {
                            students_in_bucket: {
                                nested: { path: 'person_data' },
                                aggs: {
                                    filter_students: {
                                        filter: { term: { 'person_data.person_type': 'student' } },
                                        aggs: {
                                            unique_count: { cardinality: { field: 'person_data.person_id.keyword' } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const buckets = (response.aggregations as any)?.hourly_presence?.buckets || [];

            const data = buckets.map((bucket: any) => {
                const date = new Date(bucket.key_as_string);
                const hrs = date.getHours();
                const ampm = hrs >= 12 ? 'PM' : 'AM';
                const hours = (hrs % 12) || 12; // the hour '0' should be '12'
                const timeLabel = hours + ampm;
                //we should only return data for 8AM to 5PM
                if (hrs < 8 || hrs > 17) {
                    return;
                }
                const studentCount = bucket.students_in_bucket?.filter_students?.unique_count?.value || 0;

                return {
                    time: timeLabel,
                    student: studentCount
                };
            });



            return data;

        } catch (error) {
            this.logger.error('Error getting hourly presence:', error);
            throw error;
        }
    }















}