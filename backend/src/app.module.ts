import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaModule, ElasticModule } from '@app/common';
import { configuration, validationSchema } from '@app/common/config';
import { AppService } from './app.service';
import { ViolationsModule } from './violations/violations.module';
import { ReferenceModule } from './reference/reference.module';
import { OperationsModule } from './operations/operations.module';
import { FlowModule } from './flow/flow.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { VehicleConfigModule } from './vehicle-config/vehicle-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: configuration,
      validationSchema,
      expandVariables: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB.uri') || 'mongodb://localhost:27017/traffic_violation',
        dbName: config.get<string>('MONGODB.db') || 'traffic',
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
    ElasticModule,
    ViolationsModule,
    ReferenceModule,
    OperationsModule,
    FlowModule,
    DashboardModule,
    VehicleConfigModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule { }
