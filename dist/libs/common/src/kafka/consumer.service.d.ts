import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private kafka;
    private consumer;
    private isRunning;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private connect;
    private connectWithRetry;
    private subscribe;
    private consume;
    private handleMessage;
    private safeTimestampToString;
    private processCameraEvent;
    private disconnect;
}
