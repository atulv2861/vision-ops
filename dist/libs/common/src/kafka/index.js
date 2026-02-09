"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaProducerService = exports.KafkaConsumerService = exports.KafkaModule = void 0;
var kafka_module_1 = require("./kafka.module");
Object.defineProperty(exports, "KafkaModule", { enumerable: true, get: function () { return kafka_module_1.KafkaModule; } });
var consumer_service_1 = require("./consumer.service");
Object.defineProperty(exports, "KafkaConsumerService", { enumerable: true, get: function () { return consumer_service_1.KafkaConsumerService; } });
var producer_service_1 = require("./producer.service");
Object.defineProperty(exports, "KafkaProducerService", { enumerable: true, get: function () { return producer_service_1.KafkaProducerService; } });
//# sourceMappingURL=index.js.map