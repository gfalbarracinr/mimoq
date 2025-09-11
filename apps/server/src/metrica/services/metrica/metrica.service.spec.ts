import { Test, TestingModule } from '@nestjs/testing';
import { MetricaService } from './metrica.service';

describe('MetricaService', () => {
  let service: MetricaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricaService],
    }).compile();

    service = module.get<MetricaService>(MetricaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
