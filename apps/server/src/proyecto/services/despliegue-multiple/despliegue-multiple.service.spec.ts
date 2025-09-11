import { Test, TestingModule } from '@nestjs/testing';
import { DespliegueMultipleService } from './despliegue-multiple.service';

describe('DespliegueMultipleService', () => {
  let service: DespliegueMultipleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DespliegueMultipleService],
    }).compile();

    service = module.get<DespliegueMultipleService>(DespliegueMultipleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
