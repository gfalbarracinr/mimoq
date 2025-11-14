
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDeploymentDto } from '../../dtos/despliegue.dto';

import { Proyecto } from '../../entities/proyecto.entity';
import { Despliegue } from '../../entities/despliegue.entity';

import { ProyectoService } from '../proyecto/proyecto.service';

import * as fs from 'fs-extra';
import { DespliegueService } from '../despliegue/despliegue.service';

@Injectable()
export class DespliegueIndividualService {
    private imagenesDespliegues: string[] = [];
    private nombresDespliegues: string[] = [];
    private puertosDespliegues: number[] = [];
    private puertosExposeApps: number[] = [];
    private imagenesRepository: string[] = [];

    private localRegistry = 'localhost:5000';

    constructor(
        @InjectRepository(Despliegue)
        private despliegueRepo: Repository<Despliegue>,
        private despliegueUtilsService: DespliegueService,
        private proyectoService: ProyectoService,

    ) { }
    async validateProjectToDeploy(data: CreateDeploymentDto) {
        const proyecto = await this.proyectoService.findOne(data.fk_proyecto);
        if (!proyecto) throw new InternalServerErrorException(`No se encontró el proyecto con id ${data.fk_proyecto}`);

        const existingDeployment = await this.despliegueRepo.findOne({
            where: {
                nombre_helm: data.nombre_helm,
                cant_pods: data.cant_pods,
                namespace: data.namespace,
                proyecto: proyecto
            }
        });
        if (existingDeployment) throw new InternalServerErrorException(`Este despliegue ya está registrado en la base de datos`);
        
        for (let i = 0; i < proyecto.urls_repositorios.length; i++) {
            const tempDir = `./utils/temp-repo-${Date.now()}`;
            await this.despliegueUtilsService.cloneRepository(proyecto.urls_repositorios[i], tempDir);
            const nombreCompletoImagen = `${proyecto.nombres_microservicios[i].toLowerCase().replace(/\s/g, '-')}`;

            const buildCommand = `docker build -t ${nombreCompletoImagen} ${tempDir}`;
            await this.despliegueUtilsService.executeCommand(buildCommand);
            console.log(`Imagen Docker construida correctamente`);

            const pruneCommand = 'docker image prune -f';
            await this.despliegueUtilsService.executeCommand(pruneCommand);
            console.log('Imágenes "none" eliminadas correctamente');

            const removeBuildCommand = `docker image rm ${nombreCompletoImagen}`;
            await this.despliegueUtilsService.executeCommand(removeBuildCommand);
            console.log(`Imagen Docker original eliminada correctamente`);

            this.nombresDespliegues.push('mimoq-' + nombreCompletoImagen);

            const dockerfilePath = `${tempDir}/Dockerfile`;
            const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
            const portMatch = dockerfileContent.match(/EXPOSE\s+(\d+)/);
            const port_expose = portMatch ? portMatch[1] : '';

            this.imagenesDespliegues.push(nombreCompletoImagen);
            this.puertosDespliegues.push(await this.despliegueUtilsService.findAvailablePort());
            this.puertosExposeApps.push(port_expose);
            
        }

        console.log(this.imagenesDespliegues);
        console.log(this.nombresDespliegues);

        return await this.createIndividualDeployment(proyecto, data);
    }

    async createIndividualDeployment(proyecto: Proyecto, data: CreateDeploymentDto) {
        const despliegueExitoso = await this.buildAndPushImage(data);

        const despliegues = [];
        console.log('Despliegue: ', despliegueExitoso)
        if (!despliegueExitoso) {
            throw new InternalServerErrorException(`No se pudo realizar el despliegue`);
        }
        console.log('Guardar cada deploy...')
        for (let i = 0; i < proyecto.urls_repositorios.length; i++) {
            const newDeployment = this.despliegueRepo.create(data);
            newDeployment.proyecto = proyecto;
            newDeployment.puerto = this.puertosDespliegues[i];
            
            try {
                await this.despliegueRepo.save(newDeployment)
            } catch (error) {
                throw new InternalServerErrorException(`Error al guardar el despliegue en la base de datos: ${error.message}`);
            }
            despliegues.push(newDeployment);
        }
        console.log('Despliegues: ', despliegues)
        if (despliegues != undefined) {
            return despliegues;
        } else {
            throw new InternalServerErrorException(`Despliegues vacíos!`);
        }
    }

    private async buildAndPushImage(data: CreateDeploymentDto): Promise<boolean> {
        try {
            let yamlContent = `namespace: ${data.namespace}
image:`;
            for (let i = 0; i < this.imagenesDespliegues.length; i++) {
                yamlContent += `
  - name: ${this.imagenesDespliegues[i]}
    portExpose: ${this.puertosExposeApps[i]}`;
            }
            yamlContent += `
nodePort:`;
            for (let i = 0; i < this.puertosDespliegues.length; i++) {
                yamlContent += `
  - ${this.puertosDespliegues[i]}`;
            }
            yamlContent += `
appName:`;
            for (let i = 0; i < this.nombresDespliegues.length; i++) {
                yamlContent += `
  - ${this.nombresDespliegues[i]}`;
            }
            yamlContent += `
cantReplicas:`;
            for (let i = 0; i < data.replicas.length; i++) {
                yamlContent += `
  - ${data.replicas[i]}`;
            }

            this.nombresDespliegues = [];
            this.puertosDespliegues = [];
            this.puertosExposeApps = [];
            this.imagenesDespliegues = [];

            return await this.despliegueUtilsService.deployApp(data.nombre_helm, yamlContent, data.namespace);
        } catch (error) {
            console.error(`Error en buildAndPushImage: ${error.message}`);
            return false;
        }
    }
}
