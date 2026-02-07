import { Kafka, Producer } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

export class KafkaProducerService {
    //private readonly logger = new Logger(KafkaProducerService.name);
    private kafka: Kafka;
    private producer: Producer;

    constructor(private readonly configService: ConfigService) {}
}
