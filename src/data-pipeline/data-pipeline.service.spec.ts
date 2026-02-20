import { Test, TestingModule } from '@nestjs/testing';
import { DataPipelineService } from './data-pipeline.service';

describe('DataPipelineService', () => {
  let service: DataPipelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataPipelineService],
    }).compile();

    service = module.get<DataPipelineService>(DataPipelineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
