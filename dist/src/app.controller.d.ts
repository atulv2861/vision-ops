import { AppService } from './app.service';
import { KafkaProducerService } from '../libs/common/src/kafka';
export declare class AppController {
    private readonly appService;
    private readonly kafkaProducerService;
    constructor(appService: AppService, kafkaProducerService: KafkaProducerService);
    getHello(): string;
    produceFromCsv(filePath?: string): Promise<{
        success: number;
        failed: number;
    }>;
}
