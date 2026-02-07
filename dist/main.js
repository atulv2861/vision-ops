"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const filters_1 = require("./common/filters");
const interceptors_1 = require("./common/interceptors");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port', 3000);
    const apiPrefix = configService.get('apiPrefix', 'api');
    app.setGlobalPrefix(apiPrefix);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new filters_1.AllExceptionsFilter());
    app.useGlobalInterceptors(new interceptors_1.LoggingInterceptor());
    const corsOrigin = configService.get('cors.origin', []);
    const corsCredentials = configService.get('cors.credentials', false);
    if (corsOrigin.length > 0) {
        app.enableCors({ origin: corsOrigin, credentials: corsCredentials });
    }
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map