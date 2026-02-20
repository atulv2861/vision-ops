import { Test, TestingModule } from '@nestjs/testing';
import { DataPipelineController } from './data-pipeline.controller';

describe('DataPipelineController', () => {
  let controller: DataPipelineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataPipelineController],
    }).compile();

    controller = module.get<DataPipelineController>(DataPipelineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
