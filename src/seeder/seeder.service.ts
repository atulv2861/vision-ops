import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticService } from '../../libs/common/src/elastic/elastic.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SeederService implements OnModuleInit {
    private readonly logger = new Logger(SeederService.name);
    private intervalId: NodeJS.Timeout | null = null;
    private isSeeding = false;
    private csvData: any[] = [];
    private groupedData: any[][] = [];
    private currentIndex = 0;

    constructor(private readonly elasticService: ElasticService) { }

    async onModuleInit() {
        await this.loadCsvData();
    }

    private async loadCsvData() {
        try {
            const csvPath = path.join(process.cwd(), 'libs/common/src/csv/overview.csv');
            this.logger.log(`Loading CSV data from ${csvPath}`);

            if (!fs.existsSync(csvPath)) {
                this.logger.error(`CSV file not found at ${csvPath}`);
                return;
            }

            const fileContent = fs.readFileSync(csvPath, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) return;

            const headers = lines[0].split(',').map(h => h.trim());

            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length !== headers.length) continue;

                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }

            this.csvData = data;
            this.groupData();
            this.logger.log(`Loaded ${this.csvData.length} events from CSV, grouped into ${this.groupedData.length} batches.`);
        } catch (error) {
            this.logger.error('Error loading CSV data:', error);
        }
    }

    private groupData() {
        const groups: Map<string, any[]> = new Map();

        this.csvData.forEach(row => {
            const ts = row.timestamp;
            if (!groups.has(ts)) {
                groups.set(ts, []);
            }
            groups.get(ts).push(row);
        });

        this.groupedData = Array.from(groups.values());
    }

    startContinuousSeeding(intervalMs: number = 3000) {
        if (this.isSeeding) {
            this.logger.warn('Seeding is already in progress');
            return { message: 'Seeding is already in progress' };
        }

        if (this.groupedData.length === 0) {
            this.logger.error('No data to seed. Check CSV file.');
            return { message: 'No data to seed' };
        }

        this.isSeeding = true;
        this.logger.log(`Starting continuous seeding with interval ${intervalMs}ms`);

        this.seedNextBatch();

        this.intervalId = setInterval(async () => {
            try {
                await this.seedNextBatch();
            } catch (error) {
                this.logger.error('Error during seeding cycle:', error);
            }
        }, intervalMs);

        return { message: 'Continuous seeding started' };
    }

    stopContinuousSeeding() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isSeeding = false;
        this.logger.log('Continuous seeding stopped');
        return { message: 'Continuous seeding stopped' };
    }

    private async seedNextBatch() {
        if (this.groupedData.length === 0) return;

        const batch = this.groupedData[this.currentIndex];
        const timestamp = new Date().toISOString();

        const documents = batch.map(row => {
            const doc = { ...row };
            doc.timestamp = timestamp;

            if (doc.value && !isNaN(Number(doc.value))) doc.value = Number(doc.value);

            doc.event_id = `AUTO-${Date.now()}-${doc.event_id}`;

            return {
                document: doc
            };
        });

        await this.elasticService.bulkIndex(documents);
        this.logger.debug(`Seeded batch ${this.currentIndex + 1}/${this.groupedData.length} (${documents.length} events)`);

        this.currentIndex++;
        if (this.currentIndex >= this.groupedData.length) {
            this.currentIndex = 0;
            this.logger.log('Restarting seeding loop');
        }
    }
}
