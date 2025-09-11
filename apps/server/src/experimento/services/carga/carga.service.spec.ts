import { Test, TestingModule } from '@nestjs/testing';
import { CargaService } from './carga.service';

describe('CargaService', () => {
  let service: CargaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CargaService],
    }).compile();

    service = module.get<CargaService>(CargaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
