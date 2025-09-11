import { Test, TestingModule } from '@nestjs/testing';
import { DespliegueIndividualService } from './despliegue-individual.service';

describe('DespliegueIndividualService', () => {
  let service: DespliegueIndividualService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DespliegueIndividualService],
    }).compile();

    service = module.get<DespliegueIndividualService>(DespliegueIndividualService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
