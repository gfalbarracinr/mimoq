import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioService } from './usuario.service';
import { DatabaseModule } from '../../../database/database.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Usuario } from '../../entities/usuario.entity';
import { RolUsuario } from '../../entities/rol-usuario.entity';
import { RolUsuarioService } from '../rol-usuario/rol-usuario.service';

describe('UsuarioService', () => {
  let service: UsuarioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioService,
        RolUsuarioService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            save: jest.fn().mockResolvedValue(""),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(RolUsuario),
          useValue: {
            save: jest.fn().mockResolvedValue(""),
            find: jest.fn().mockResolvedValue([]),
          },
        }
      ],
    }).compile();

    service = module.get<UsuarioService>(UsuarioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
