import { Test, TestingModule } from '@nestjs/testing';
import { TableroService } from './tablero.service';

describe('TableroService', () => {
  let service: TableroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableroService],
    }).compile();

    service = module.get<TableroService>(TableroService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
