import { Test, TestingModule } from '@nestjs/testing';
import { RolUsuarioService } from './rol-usuario.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolUsuario } from '../../entities/rol-usuario.entity';

describe('RolUsuarioService', () => {
  let service: RolUsuarioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolUsuarioService,
        {
          provide: getRepositoryToken(RolUsuario),
          useValue: {
            save: jest.fn().mockResolvedValue(""),
            find: jest.fn().mockResolvedValue([]),
          },
        }
      ],
    }).compile();

    service = module.get<RolUsuarioService>(RolUsuarioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
