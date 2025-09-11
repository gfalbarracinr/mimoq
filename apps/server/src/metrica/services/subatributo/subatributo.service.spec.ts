import { Test, TestingModule } from '@nestjs/testing';
import { SubatributoService } from './subatributo.service';

describe('SubatributoService', () => {
  let service: SubatributoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubatributoService],
    }).compile();

    service = module.get<SubatributoService>(SubatributoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
