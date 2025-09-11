import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { DespliegueService } from '../despliegue/despliegue.service';
import { Proyecto } from '../../entities/proyecto.entity';
import { UsuarioService } from '../../../usuario/services/usuario/usuario.service';
import { Usuario } from '../../../usuario/entities/usuario.entity';
import { CreateProjectDto, UpdateProjectDto } from '../../dtos/proyecto.dto';

interface ServiceConfig {
  image: string;
  container_name: string;
  ports: [''];
}
interface DockerComposeConfig {
  services: { [serviceName: string]: ServiceConfig };
}
@Injectable()
export class ProyectoService {
  constructor(
    @InjectRepository(Proyecto)
    private proyectoRepo: Repository<Proyecto>,
    private usuarioService: UsuarioService,
    private despliegueUtilsService: DespliegueService,
  ) { }

  async findAll() {
    try {
      return await this.proyectoRepo.find({
        relations: ['usuario']
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando los proyectos: ${error}`,
      );
    }
  }

  async findAllByUser(id: number) {
    try {
      const usuario = await this.usuarioService.findOne(id);
      if (!(usuario instanceof Usuario)) {
        throw new NotFoundException(
          `Usuario con id #${id} no se encuentra en la Base de Datos para mostrar los proyectos`,
        );
      }
      return await this.proyectoRepo.find({
        where: { usuario: usuario }
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando los proyectos de un usuario: ${error}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const project = await this.proyectoRepo.findOne({
        where: { id_proyecto: id },
        relations: ['despliegues']
      });
      if (!(project instanceof Proyecto)) {
        throw new NotFoundException(
          `Proyecto con id #${id} no se encuentra en la Base de Datos`,
        );
      }
      return project;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando proyecto por id: ${error}`,
      );
    }
  }

  async findOneByUrlProjectAndName(url_repositorio: string, nombre: string) {
    try {
      const project = await this.proyectoRepo.findOne({
        where: { url_repositorio: url_repositorio, nombre: nombre },
        relations: ['despliegues']
      });
      return project;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando el proyecto dada la url: ${error}`,
      );
    }
  }

  async findOneByUrlsProjectAndName(urls_repositorios: string[], nombre: string) {
    try {
      const project = await this.proyectoRepo.findOne({
        where: { /*urls_repositorios: urls_repositorios,*/ nombre: nombre },
        relations: ['despliegues']
      });
      return project;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando el proyecto dada la url: ${error}`,
      );
    }
  }

  async createProject(data: CreateProjectDto) {
    try {
      let namesApp: string[] = [''];

      const projectExistsI = await this.findOneByUrlProjectAndName(data.url_repositorio, data.nombre);
      const projectExistsM = await this.findOneByUrlsProjectAndName(data.urls_repositorios, data.nombre);

      if (projectExistsI instanceof Proyecto || projectExistsM instanceof Proyecto) {
        throw new InternalServerErrorException(
          `Este proyecto ya se encuentra registrado en la BD`,
        );
      }

      const newProject = this.proyectoRepo.create(data);

      if (data.docker_compose == true) {
        const tempDir = `./utils/temp-repo-${Date.now()}`;
        await this.despliegueUtilsService.cloneRepository(data.url_repositorio, tempDir);

        const composeData = this.parseDockerCompose(`${tempDir}/docker-compose.yml`);
        const imagesToBuild = this.dockerImageParameters(composeData);

        namesApp = imagesToBuild.map(container => {
          const index = container.container_name.indexOf("/");
          let nameApp = container.container_name.substring(index + 1);
          return `${nameApp.toLowerCase().replace(/\s/g, '-')}`;
        })

        newProject.nombres_microservicios = namesApp;
      }

      if (data.fk_usuario) {
        const user = await this.usuarioService.findOne(data.fk_usuario);
        newProject.usuario = user;
      }

      return this.proyectoRepo.save(newProject);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas creando el proyecto: ${error}`,
      );
    }
  }

  private parseDockerCompose(filePath: string): DockerComposeConfig {
    try {
      const composeData: DockerComposeConfig = yaml.load(fs.readFileSync(filePath, 'utf8')) as DockerComposeConfig;
      return composeData;
    } catch (error) {
      console.error(error);
      throw new Error('Error parsing docker-compose file');
    }
  }

  private dockerImageParameters(composeData: DockerComposeConfig): any[] {
    const kubernetesSpecs: any[] = [];
    for (const serviceName in composeData.services) {
      if (composeData.services.hasOwnProperty(serviceName)) {
        const serviceConfig = composeData.services[serviceName];
        const [port1,] = serviceConfig.ports[0].split(':').map(port => parseInt(port, 10));

        if (serviceConfig.image != undefined) {
          const kubernetesSpec = {
            name: serviceName,
            image: serviceConfig.image,
            port_expose: port1,
            container_name: serviceConfig.container_name
          };
          kubernetesSpecs.push(kubernetesSpec);
        }
      }
    }
    return kubernetesSpecs;
  }

  async updateProject(id: number, cambios: UpdateProjectDto) {
    try {
      const proyecto = await this.proyectoRepo.findOneBy({ id_proyecto: id });

      if (cambios.fk_usuario) {
        const user = await this.usuarioService.findOne(cambios.fk_usuario);
        proyecto.usuario = user;
      }

      this.proyectoRepo.merge(proyecto, cambios);
      return this.proyectoRepo.save(proyecto);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas actualizando el proyecto: ${error}`,
      );
    }
  }

  removeProject(id: number) {
    return this.proyectoRepo.delete(id);
  }
}
