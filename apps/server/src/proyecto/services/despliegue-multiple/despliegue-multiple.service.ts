/** NestJS */
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
/** Dtos */
import { CreateDeploymentDto, UpdateDeploymentDto } from '../../dtos/despliegue.dto';
/** Entities */
import { Proyecto } from '../../entities/proyecto.entity';
import { Despliegue } from '../../entities/despliegue.entity';
/** Services */
import { ProyectoService } from '../proyecto/proyecto.service';
/** Utils */
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { DespliegueService } from '../despliegue/despliegue.service';
import { spawn } from 'child_process';

/** Intefaces para el despliegue con docker-compose */
interface ServiceConfig {
  image: string;
  container_name: string;
  ports: [''];
  build: string;
}
interface DockerComposeConfig {
  services: { [serviceName: string]: ServiceConfig };
}

@Injectable()
export class DespliegueMultipleService {
  private imagenesDespliegues: string[] = [];
  private nombresDespliegues: string[] = [];
  private puertosDespliegues: number[] = [];
  private puertosExposeApps: number[] = [];
  private imagenesRepository: string[] = [];

  constructor(
    @InjectRepository(Despliegue)
    private despliegueRepo: Repository<Despliegue>,
    @InjectRepository(Proyecto)
    private proyectoRepo: Repository<Proyecto>,
    private despliegueUtilsService: DespliegueService,
    private proyectoService: ProyectoService,
  ) { }

  /** Revisa si los microservicios están en un mismo repo o no */
  async validateProjectToDeploy(data: CreateDeploymentDto) {
    const proyecto = await this.proyectoService.findOne(data.fk_proyecto);
    if (!proyecto) {
      throw new InternalServerErrorException(`No se encontró el proyecto con id ${data.fk_proyecto}`);
    }

    const tempDir = `./utils/temp-repo-${Date.now()}`;
    await this.despliegueUtilsService.cloneRepository(proyecto.url_repositorio, tempDir);

    if (proyecto.docker_compose) {
      if (proyecto.dockerfile) {
        /**
         * Docker compose con servicios que tiene image o build
         * PERO los servicios no tienen puertos en el compose, sino que toca sacarlos del Dockerfile que se construye
         * Para la construcción, se debe tomar el path de "build", ir allí, construir la imagen y sacar el puerto de dockerfile
         */
        this.recorrerCadaCarpetaDelRepoParaDockerfile(proyecto, data, tempDir);
      } else {
        /**
         * Docker compose con servicios que tienen image o build
         */
        return await this.pullAndPushImageFromDockerCompose(proyecto, data, tempDir);
      }
    }
  }

  async recorrerCadaCarpetaDelRepoParaDockerfile(proyecto: Proyecto, data: CreateDeploymentDto, tempDir: string) {
    try {
      const composeData = this.parseDockerCompose(`${tempDir}/docker-compose.yml`);
      const imagesToBuild = this.dockerImageBuildParameters(composeData);

      return await this.pullImage(proyecto, imagesToBuild, data)
    } catch (error) {
      console.error(`Error en buildAndPushMultipleImage: ${error.message}`);
      return false;
    }
  }

  /** Crear imágenes en el registro local si el repositorio tiene docker-compose */
  private async pullAndPushImageFromDockerCompose(proyecto: Proyecto, data: CreateDeploymentDto, tempDir: string) {
    try {
      const composeData = this.parseDockerCompose(`${tempDir}/docker-compose.yml`);
      const imagesToBuild = this.dockerImageParameters(composeData);

      return await this.pullImage(proyecto, imagesToBuild, data)
    } catch (error) {
      console.error(`Error en buildAndPushMultipleImage: ${error.message}`);
      return false;
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

  private dockerImageBuildParameters(composeData: DockerComposeConfig): any[] {
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

  private async pullImage(proyecto: Proyecto, imagesToBuild: any[], data: CreateDeploymentDto) {
    let desplieguesRealizados: Despliegue[] = [];
    const localRegistry = 'localhost:5000';

    for (const container of imagesToBuild) {
      const imageName = container.image;
      const containerName = container.container_name;
      const imageLocalRegistry = `${localRegistry}/${imageName}`;
      console.log(`Desplegando el contenedor con nombre: ${container.name}`)

      const pullCommand = `docker pull ${imageName}`;
      await this.despliegueUtilsService.executeCommand(pullCommand);
      console.log(`Haciendo pull de la imagen`);

      const tagCommand = `docker tag ${imageName} ${imageLocalRegistry}`;
      await this.despliegueUtilsService.executeCommand(tagCommand);
      console.log(`Imagen Docker etiquetada correctamente`);

      const removeBuildCommand = `docker image rm ${imageName}`;
      await this.despliegueUtilsService.executeCommand(removeBuildCommand);
      console.log(`Imagen Docker original eliminada correctamente`);

      const pushCommand = `docker push ${imageLocalRegistry}`;
      await this.despliegueUtilsService.executeCommand(pushCommand);
      console.log(`Imagen Docker subida correctamente al registry local`);

      this.imagenesDespliegues.push(imageName);

      const index = containerName.indexOf("/");
      let nameApp = containerName.substring(index + 1);
      nameApp = `${nameApp.toLowerCase().replace(/\s/g, '-')}`;

      this.nombresDespliegues.push(nameApp);
      this.puertosDespliegues.push(await this.despliegueUtilsService.findAvailablePort());
      this.puertosExposeApps.push(container.port_expose);
      this.imagenesRepository.push(imageLocalRegistry);
    }

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

    yamlContent += `
autoscaling: ${data.autoescalado == undefined ? true : data.autoescalado}`;

    yamlContent += `
minReplicas: ${data.min_replicas == undefined ? 1 : data.min_replicas}`;

    yamlContent += `
maxReplicas: ${data.max_replicas == undefined ? 5 : data.max_replicas}`;

    yamlContent += `
targetCPUUtilizationPercentage: ${data.utilization_cpu == undefined ? 80 : data.utilization_cpu}`;

    await this.despliegueUtilsService.deployApp(data.nombre_helm, yamlContent, data.namespace);

    const code = await this.executeInBackground(this.nombresDespliegues, data.namespace);

    if (code === 0) {
      for (let i = 0; i < imagesToBuild.length; i++) {
        const newDeployment = this.despliegueRepo.create(data);
        newDeployment.nombre = this.nombresDespliegues[i];
        newDeployment.puerto = this.puertosDespliegues[i];
        newDeployment.cant_replicas = data.replicas[i];
        try {
          await this.despliegueRepo.save(newDeployment)
        } catch (error) {
          throw new InternalServerErrorException(`Error al guardar el despliegue en la base de datos: ${error.message}`);
        }
        desplieguesRealizados.push(newDeployment);
      }
      proyecto.imagenes_deploy = this.imagenesDespliegues;
      proyecto.puertos_imagenes = this.puertosExposeApps;
      proyecto.puertos_deploy = this.puertosDespliegues;
      proyecto.despliegues = desplieguesRealizados;
      await this.proyectoRepo.save(proyecto);

      this.imagenesDespliegues = [];
      this.nombresDespliegues = [];
      this.puertosDespliegues = [];
      this.puertosExposeApps = [];
      this.imagenesRepository = [];

      return desplieguesRealizados;
    } else {
      throw new InternalServerErrorException(`Error al subproceso`);
    }
  }

  // Agrego el + 6 porque son los pods de grafana y prometheus
  executeInBackground = async (nombresDespliegues: string[], namespace: string) => {
    return new Promise((resolve, reject) => {
      const timeoutSeconds = 300; // 5 minutos (en segundos)
      const startTime = Math.floor(Date.now() / 1000);
      const subprocess = spawn('bash');
      subprocess.stdin.write(`
while true; do
  numberOfRunningPods=$(microk8s kubectl get pods -n ${namespace} -o=json | jq -r '.items[] | select(any(.status.containerStatuses[]; .state.running)) | .metadata.labels.app' | wc -l)
  echo "Número de pods en estado 'Running': $numberOfRunningPods de ${nombresDespliegues.length}"

  if [[ ${this.nombresDespliegues.length} -le $numberOfRunningPods ]]; then
    echo "Condición cumplida. Saliendo del bucle."
    exit 0
  fi

  if (( $(date +%s) - ${startTime} > ${timeoutSeconds} )); then
    echo "Tiempo de espera agotado. Saliendo del bucle."
    exit 1
  fi

  sleep 1
done
`);

      subprocess.stdin.end();

      subprocess.stdout.on('data', (data) => {
        console.log(data.toString().trim());
      });

      subprocess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
      });

      subprocess.on('close', (code) => {
        if (code === 0) {
          console.log("El proceso hijo se completó exitosamente.");
          resolve(code);
        } else {
          console.error(`El proceso hijo finalizó con código de salida ${code}`);
          reject(1);
        }
      });
    });
  };

  async updateDeployment(id: number, cambios: UpdateDeploymentDto) {
    const despliegue = await this.despliegueRepo.findOneBy({ id_despliegue: id });
    if (!despliegue) {
      throw new NotFoundException(`Despliegue con id #${id} no se encuentra en la Base de Datos`);
    }

    const proyecto = await this.proyectoRepo.findOneBy({ id_proyecto: cambios.fk_proyecto });
    if (!proyecto) {
      throw new NotFoundException(`Proyecto con id #${id} no se encuentra en la Base de Datos`);
    }

    const imagenesDespliegues = proyecto.imagenes_deploy;
    const puertosExposeApps = proyecto.puertos_imagenes;
    const puertosDespliegues = proyecto.puertos_deploy;
    const nombresDespliegues = proyecto.nombres_microservicios;

let yamlContent = `namespace: ${cambios.namespace}
image:`;

    for (let i = 0; i < imagenesDespliegues.length; i++) {
      yamlContent += `
  - name: ${imagenesDespliegues[i]}
    portExpose: ${puertosExposeApps[i]}`;
    }

    yamlContent += `
nodePort:`;

    for (let i = 0; i < puertosDespliegues.length; i++) {
      yamlContent += `
  - ${puertosDespliegues[i]}`;
    }

    yamlContent += `
appName:`;

    for (let i = 0; i < nombresDespliegues.length; i++) {
      yamlContent += `
  - ${nombresDespliegues[i]}`;
    }

    yamlContent += `
cantReplicas:`;

    for (let i = 0; i < cambios.replicas.length; i++) {
      yamlContent += `
  - ${cambios.replicas[i]}`;
    }

    await this.despliegueUtilsService.deployApp(cambios.nombre_helm, yamlContent, cambios.namespace);
    const code = await this.executeInBackground(nombresDespliegues, cambios.namespace);
    if (code !== 0) {
      throw new InternalServerErrorException(`Los microservicios no se desplegaron correctamente`);
    }

    this.despliegueRepo.merge(despliegue, cambios);
    return await this.despliegueRepo.save(despliegue);
  }
}
