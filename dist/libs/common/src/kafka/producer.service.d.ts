import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface CameraEventData {
    section: string;
    entity: string;
    sub_entity: string;
    metric: string;
    value: string;
    unit: string;
    extra_info: string;
    timestamp: string;
}
export declare class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private kafka;
    private producer;
    private isConnected;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private connect;
    private connectWithRetry;
    private disconnect;
    private ensureConnection;
    produceMessage(data: CameraEventData, key?: string): Promise<void>;
    produceMessages(messages: Array<{
        data: CameraEventData;
        key?: string;
    }>): Promise<void>;
    produceFromCsv(csvFilePath?: string): Promise<{
        success: number;
        failed: number;
    }>;
    produceEvent(section: string, entity: string, data: Partial<CameraEventData>): Promise<void>;
}
