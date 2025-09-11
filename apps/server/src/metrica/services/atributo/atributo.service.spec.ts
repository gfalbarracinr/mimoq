import { Test, TestingModule } from '@nestjs/testing';
import { AtributoService } from './atributo.service';

describe('AtributoService', () => {
  let service: AtributoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AtributoService],
    }).compile();

    service = module.get<AtributoService>(AtributoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
