import { Test, TestingModule } from '@nestjs/testing';
import { DespliegueService } from './despliegue.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Despliegue } from '../../entities/despliegue.entity';

describe('DespliegueService', () => {
  let service: DespliegueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DespliegueService,
        {
          provide: getRepositoryToken(Despliegue),
          useValue: {
            save: jest.fn().mockResolvedValue(""),
            find: jest.fn().mockResolvedValue([]),
          },
        }
      ],
    }).compile();

    service = module.get<DespliegueService>(DespliegueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
