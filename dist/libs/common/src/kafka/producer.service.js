"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KafkaProducerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaProducerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const kafkajs_1 = require("kafkajs");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const csv = require('csv-parser');
let KafkaProducerService = KafkaProducerService_1 = class KafkaProducerService {
    configService;
    logger = new common_1.Logger(KafkaProducerService_1.name);
    kafka;
    producer;
    isConnected = false;
    constructor(configService) {
        this.configService = configService;
        const broker = this.configService.get('kafka.broker') || 'localhost:9092';
        const clientId = this.configService.get('kafka.clientId') || 'vision-ops-producer';
        const connectionTimeout = this.configService.get('kafka.connectionTimeout', 3000);
        const requestTimeout = this.configService.get('kafka.requestTimeout', 30000);
        const retryConfig = this.configService.get('kafka.retry', {
            retries: 5,
            initialRetryTime: 100,
            multiplier: 2,
        });
        this.kafka = new kafkajs_1.Kafka({
            clientId,
            brokers: broker.split(',').map((b) => b.trim()),
            connectionTimeout,
            requestTimeout,
            logLevel: 2,
        });
        this.producer = this.kafka.producer({
            allowAutoTopicCreation: true,
            retry: {
                retries: retryConfig.retries || 5,
                initialRetryTime: retryConfig.initialRetryTime || 100,
                multiplier: retryConfig.multiplier || 2,
            },
        });
    }
    async onModuleInit() {
        await this.connect();
    }
    async onModuleDestroy() {
        await this.disconnect();
    }
    async connect() {
        try {
            await this.producer.connect();
            this.isConnected = true;
            this.logger.log('Kafka producer connected successfully');
            return true;
        }
        catch (error) {
            this.logger.error('Failed to connect Kafka producer', error);
            this.isConnected = false;
            return false;
        }
    }
    async connectWithRetry() {
        const maxRetries = this.configService.get('kafka.retry.retries', 5);
        const initialRetryTime = this.configService.get('kafka.retry.initialRetryTime', 100);
        const multiplier = this.configService.get('kafka.retry.multiplier', 2);
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const connected = await this.connect();
            if (connected) {
                return;
            }
            if (attempt < maxRetries - 1) {
                const retryTime = initialRetryTime * Math.pow(multiplier, attempt);
                this.logger.warn(`Kafka producer connection failed. Retrying in ${retryTime}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, retryTime));
            }
        }
        this.logger.error(`Kafka producer failed to connect after ${maxRetries} attempts. Will continue retrying in background.`);
        setTimeout(() => this.connectWithRetry(), 10000);
    }
    async disconnect() {
        try {
            if (this.producer && this.isConnected) {
                await this.producer.disconnect();
                this.isConnected = false;
                this.logger.log('Kafka producer disconnected');
            }
        }
        catch (error) {
            this.logger.error('Error disconnecting Kafka producer', error);
        }
    }
    async ensureConnection(maxRetries = 3) {
        if (this.isConnected) {
            return true;
        }
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const connected = await this.connect();
            if (connected) {
                return true;
            }
            if (attempt < maxRetries - 1) {
                const waitTime = 1000 * (attempt + 1);
                this.logger.warn(`Connection attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${waitTime}ms...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
        return false;
    }
    async produceMessage(data, key) {
        const connected = await this.ensureConnection();
        if (!connected) {
            throw new Error('Kafka producer is not connected. Please check Kafka broker availability.');
        }
        try {
            const topic = this.configService.get('kafka.topics.cameraEvents') || 'visionops.camera.events.v1';
            const message = {
                topic,
                messages: [
                    {
                        key: key || data.entity || undefined,
                        value: JSON.stringify({
                            ...data,
                            timestamp: data.timestamp || new Date().toISOString(),
                        }),
                    },
                ],
            };
            const result = await this.producer.send(message);
            this.logger.debug(`Message sent successfully - Topic: ${topic}, Partition: ${result[0].partition}, Offset: ${result[0].baseOffset}`);
        }
        catch (error) {
            this.logger.error('Error producing message', error);
            throw error;
        }
    }
    async produceMessages(messages) {
        const connected = await this.ensureConnection();
        if (!connected) {
            throw new Error('Kafka producer is not connected. Please check Kafka broker availability.');
        }
        try {
            const topic = this.configService.get('kafka.topics.cameraEvents') || 'visionops.camera.events.v1';
            const kafkaMessages = messages.map(({ data, key }) => ({
                key: key || data.entity || undefined,
                value: JSON.stringify({
                    ...data,
                    timestamp: data.timestamp || new Date().toISOString(),
                }),
            }));
            const result = await this.producer.send({
                topic,
                messages: kafkaMessages,
            });
            this.logger.log(`Successfully sent ${messages.length} messages to topic: ${topic}`);
            this.logger.debug(`First partition: ${result[0].partition}, Last offset: ${result[result.length - 1].baseOffset}`);
        }
        catch (error) {
            this.logger.error('Error producing messages', error);
            throw error;
        }
    }
    async produceFromCsv(csvFilePath) {
        const connected = await this.ensureConnection(5);
        if (!connected) {
            throw new Error('Kafka producer is not connected. Please check Kafka broker availability and ensure the broker is accessible.');
        }
        const filePath = csvFilePath || path.join(process.cwd(), 'libs', 'common', 'src', 'csv', 'vision-ops.csv');
        this.logger.log(`Reading CSV file from: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`CSV file not found at: ${filePath}`);
        }
        const messages = [];
        let successCount = 0;
        let failedCount = 0;
        return new Promise((resolve, reject) => {
            const stream = fs
                .createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                if (!row.section && !row.entity) {
                    return;
                }
                const eventData = {
                    section: row.section || '',
                    entity: row.entity || '',
                    sub_entity: row.sub_entity || '',
                    metric: row.metric || '',
                    value: row.value || '',
                    unit: row.unit || '',
                    extra_info: row.extra_info || '',
                    timestamp: row.timestamp || new Date().toISOString(),
                };
                const key = eventData.entity || eventData.section;
                messages.push({ data: eventData, key });
            })
                .on('end', async () => {
                this.logger.log(`Parsed ${messages.length} rows from CSV file`);
                if (messages.length === 0) {
                    this.logger.warn('No valid messages found in CSV file');
                    resolve({ success: 0, failed: 0 });
                    return;
                }
                try {
                    const delayMs = this.configService.get('kafka.producer.delayBetweenMessages', 5000);
                    this.logger.log(`Starting to produce ${messages.length} messages with ${delayMs}ms delay between each message`);
                    for (let i = 0; i < messages.length; i++) {
                        const message = messages[i];
                        try {
                            await this.produceMessage(message.data, message.key);
                            successCount++;
                            this.logger.debug(`Sent message ${i + 1}/${messages.length} - ${message.data.entity || message.data.section}`);
                            if (i < messages.length - 1) {
                                await new Promise((resolve) => setTimeout(resolve, delayMs));
                            }
                        }
                        catch (error) {
                            this.logger.error(`Failed to send message ${i + 1}/${messages.length}`, error);
                            failedCount++;
                        }
                    }
                    this.logger.log(`CSV processing completed - Success: ${successCount}, Failed: ${failedCount}`);
                    resolve({ success: successCount, failed: failedCount });
                }
                catch (error) {
                    this.logger.error('Error processing CSV messages', error);
                    reject(error);
                }
            })
                .on('error', (error) => {
                this.logger.error('Error reading CSV file', error);
                reject(error);
            });
        });
    }
    async produceEvent(section, entity, data) {
        const eventData = {
            section,
            entity,
            sub_entity: data.sub_entity || '',
            metric: data.metric || '',
            value: data.value || '',
            unit: data.unit || '',
            extra_info: data.extra_info || '',
            timestamp: data.timestamp || new Date().toISOString(),
        };
        await this.produceMessage(eventData, entity);
    }
};
exports.KafkaProducerService = KafkaProducerService;
exports.KafkaProducerService = KafkaProducerService = KafkaProducerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KafkaProducerService);
//# sourceMappingURL=producer.service.js.map