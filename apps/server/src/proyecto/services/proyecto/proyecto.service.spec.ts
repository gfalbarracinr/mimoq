import { Test, TestingModule } from '@nestjs/testing';
import { ProyectoService } from './proyecto.service';
import { UsuarioService } from '../../../usuario/services/usuario/usuario.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Proyecto } from '../../entities/proyecto.entity';
import { DespliegueService } from '../despliegue/despliegue.service';
import { Usuario } from '../../../usuario/entities/usuario.entity';
import { Despliegue } from '../../entities/despliegue.entity';

describe('ProjectService', () => {
  let service: ProyectoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectoService,
        UsuarioService,
        DespliegueService,
        {
          provide: getRepositoryToken(Proyecto),
          useValue: {
            save: jest.fn().mockResolvedValue(""),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            save: jest.fn().mockResolvedValue(""),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Despliegue),
          useValue: {
            save: jest.fn().mockResolvedValue(""),
            find: jest.fn().mockResolvedValue([]),
          },
        }
      ],
    }).compile();

    service = module.get<ProyectoService>(ProyectoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
