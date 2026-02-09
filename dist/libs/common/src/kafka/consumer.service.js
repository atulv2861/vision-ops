"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KafkaConsumerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaConsumerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const kafkajs_1 = require("kafkajs");
let KafkaConsumerService = KafkaConsumerService_1 = class KafkaConsumerService {
    configService;
    logger = new common_1.Logger(KafkaConsumerService_1.name);
    kafka;
    consumer;
    isRunning = false;
    constructor(configService) {
        this.configService = configService;
        const broker = this.configService.get('kafka.broker') || 'localhost:9092';
        const clientId = this.configService.get('kafka.clientId') || 'vision-ops-consumer';
        const connectionTimeout = this.configService.get('kafka.connectionTimeout', 3000);
        const requestTimeout = this.configService.get('kafka.requestTimeout', 30000);
        this.kafka = new kafkajs_1.Kafka({
            clientId,
            brokers: broker.split(',').map((b) => b.trim()),
            connectionTimeout,
            requestTimeout,
            logLevel: 2,
        });
        const groupId = this.configService.get('kafka.groupId') || 'vision-ops-group';
        this.consumer = this.kafka.consumer({ groupId });
    }
    async onModuleInit() {
        this.connectWithRetry().catch((error) => {
            this.logger.warn('Kafka consumer will retry connection in background', error.message);
        });
    }
    async onModuleDestroy() {
        await this.disconnect();
    }
    async connect() {
        try {
            await this.consumer.connect();
            this.logger.log('Kafka consumer connected successfully');
            return true;
        }
        catch (error) {
            this.logger.error('Failed to connect Kafka consumer', error);
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
                await this.subscribe();
                await this.consume();
                return;
            }
            if (attempt < maxRetries - 1) {
                const retryTime = initialRetryTime * Math.pow(multiplier, attempt);
                this.logger.warn(`Kafka consumer connection failed. Retrying in ${retryTime}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, retryTime));
            }
        }
        this.logger.error(`Kafka consumer failed to connect after ${maxRetries} attempts. Will continue retrying in background.`);
        setTimeout(() => this.connectWithRetry(), 10000);
    }
    async subscribe() {
        try {
            const topic = this.configService.get('kafka.topics.cameraEvents') || 'visionops.camera.events.v1';
            await this.consumer.subscribe({ topic, fromBeginning: false });
            this.logger.log(`Subscribed to topic: ${topic}`);
        }
        catch (error) {
            this.logger.error('Failed to subscribe to topic', error);
            throw error;
        }
    }
    async consume() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.logger.log('Starting to consume messages...');
        try {
            await this.consumer.run({
                eachMessage: async (payload) => {
                    await this.handleMessage(payload);
                },
            });
        }
        catch (error) {
            this.logger.error('Error consuming messages', error);
            this.isRunning = false;
        }
    }
    async handleMessage(payload) {
        const { topic, partition, message } = payload;
        const { offset, key, value, timestamp } = message;
        this.logger.log(`Received message - Topic: ${topic}, Partition: ${partition}, Offset: ${offset}`);
        try {
            const messageValue = value ? value.toString() : null;
            let parsedData = null;
            if (messageValue) {
                try {
                    parsedData = JSON.parse(messageValue);
                }
                catch (parseError) {
                    this.logger.warn('Failed to parse message as JSON, treating as string');
                    parsedData = messageValue;
                }
            }
            const timestampISO = this.safeTimestampToString(timestamp);
            this.logger.debug('Message details:', {
                topic,
                partition,
                offset,
                key: key ? key.toString() : null,
                timestamp: timestampISO,
                value: parsedData,
            });
            await this.processCameraEvent(parsedData, {
                topic,
                partition,
                offset,
                key: key ? key.toString() : null,
                timestamp: timestampISO,
            });
        }
        catch (error) {
            this.logger.error('Error handling message', {
                error: error.message,
                topic,
                partition,
                offset,
            });
        }
    }
    safeTimestampToString(timestamp) {
        if (!timestamp) {
            return null;
        }
        try {
            if (typeof timestamp === 'number') {
                const date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
                if (isNaN(date.getTime())) {
                    return null;
                }
                return date.toISOString();
            }
            if (typeof timestamp === 'string') {
                if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                    return timestamp;
                }
                const date = new Date(timestamp);
                if (isNaN(date.getTime())) {
                    return new Date().toISOString();
                }
                return date.toISOString();
            }
            return null;
        }
        catch (error) {
            return new Date().toISOString();
        }
    }
    async processCameraEvent(data, metadata) {
        this.logger.log('Processing camera event:', {
            data,
            metadata,
        });
        this.logger.log(`Camera event processed successfully - Offset: ${metadata.offset}`);
    }
    async disconnect() {
        try {
            if (this.consumer) {
                await this.consumer.disconnect();
                this.logger.log('Kafka consumer disconnected');
            }
        }
        catch (error) {
            this.logger.error('Error disconnecting Kafka consumer', error);
        }
    }
};
exports.KafkaConsumerService = KafkaConsumerService;
exports.KafkaConsumerService = KafkaConsumerService = KafkaConsumerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KafkaConsumerService);
//# sourceMappingURL=consumer.service.js.map