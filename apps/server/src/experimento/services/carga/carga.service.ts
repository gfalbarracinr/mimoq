import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carga } from '../../entities/carga.entity';
import { Experimento } from '../../entities/experimento.entity';
import { Despliegue } from '../../../proyecto/entities/despliegue.entity';
import { CreateCargaDto, UpdateCargaDto } from '../../dtos/carga.dto';
import { K6Service } from 'src/k6/k6.service';
import { ChaosService } from 'src/chaos/services/chaos.service';
import { DespliegueService } from '../../../proyecto/services/despliegue/despliegue.service';

@Injectable()
export class CargaService {
    constructor(
        @InjectRepository(Carga)
        private cargaRepo: Repository<Carga>,
        @InjectRepository(Experimento)
        private experimentoRepo: Repository<Experimento>,
        @InjectRepository(Despliegue)
        private despliegueRepo: Repository<Despliegue>,
        private k6Service: K6Service,
        private chaosService: ChaosService,
        private despliegueService: DespliegueService,
    ) { }

    async findAll() {
        try {
            return await this.cargaRepo.find({});
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas encontrando las cargas: ${error}`,
            );
        }
    }

    async findOne(id: number) {
        try {
            const carga = await this.cargaRepo.findOneBy({ id_carga: id });
            if (!(carga instanceof Carga)) {
                throw new NotFoundException(
                    `Carga con id #${id} no se encuentra en la Base de Datos`,
                );
            }
            return carga;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas encontrando la carga por id: ${error}`,
            );
        }
    }

    async createCarga(data: CreateCargaDto) {
        try {
            const newCarga = this.cargaRepo.create(data);
            return this.cargaRepo.save(newCarga);
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas creando la carga: ${error}`,
            );
        }
    }

    async updateCarga(id: number, cambios: UpdateCargaDto) {
        try {
            const carga = await this.cargaRepo.findOneBy({ id_carga: id });
            this.cargaRepo.merge(carga, cambios);
            return this.cargaRepo.save(carga);
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas actualizando el experimento: ${error}`,
            );
        }
    }

    removeCarga(id: number) {
        return this.cargaRepo.delete(id);
    }

    private calculateMaxK6Duration(payload: any): string {
        const generalDuration = payload.duracion || '30s';
        let maxDuration = generalDuration;

        if (payload.servicios && Array.isArray(payload.servicios)) {
            for (const servicio of payload.servicios) {
                if (servicio.endpoints && Array.isArray(servicio.endpoints)) {
                    for (const endpoint of servicio.endpoints) {
                        if (endpoint.duracion) {
                            
                            const endpointMs = this.parseDurationToMs(endpoint.duracion);
                            const maxMs = this.parseDurationToMs(maxDuration);
                            if (endpointMs > maxMs) {
                                maxDuration = endpoint.duracion;
                            }
                        }
                    }
                }
            }
        }

        return maxDuration;
    }

    private parseDurationToMs(duration: string): number {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 30000; 
        }
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 30000;
        }
    }

    async executeExperiment(payload: any, progressCallback?: (progress: any) => void) {
        try {
            const { chaosExperiments, ...k6Payload } = payload;

            // Obtener número de repeticiones (default: 1)
            const numRepetitions = k6Payload.replicas || 1;
            const k6Duration = this.calculateMaxK6Duration(k6Payload);
            const delayMs = 60000; // 1 minuto entre repeticiones

            // Obtener o crear carga
            let carga = await this.cargaRepo.findOne({ where: {}, order: { id_carga: 'DESC' } });
            if (!carga) {
                carga = this.cargaRepo.create({
                    cant_usuarios: [],
                    duracion_picos: [],
                });
                carga = await this.cargaRepo.save(carga);
            }

            // Obtener namespace del primer servicio
            const namespace = k6Payload.servicios && k6Payload.servicios.length > 0 
                ? (k6Payload.servicios[0].namespace || 'default')
                : 'default';

            const allResults = [];
            const allSavedExperiments = [];
            
            // Calcular duración y overhead
            const durationMs = this.parseDurationToMs(k6Duration);
            const overheadMs = 30000; // 30 segundos de overhead para setup/teardown del test
            // Tiempo total que debe esperar cada repetición: duración del test + delay de 1 minuto
            const totalWaitTimeMs = durationMs + delayMs;

            // Ejecutar múltiples repeticiones secuencialmente
            for (let repetition = 0; repetition < numRepetitions; repetition++) {
                const experimentId = `exp-${Date.now()}-rep-${repetition}`;
                
                // fecha_inicio: momento real cuando inicia esta repetición
                const startTime = new Date();
                
                // Calcular fecha_fin considerando:
                // - Duración del test (tiempo que k6 ejecutará el test)
                // - Overhead de setup/teardown (tiempo para crear recursos, iniciar pods, etc.)
                const endTime = new Date(startTime.getTime() + durationMs + overheadMs);

                // Preparar payload para esta repetición
                const k6PayloadWithRepetition = {
                    ...k6Payload,
                    repetitionNumber: repetition,
                    totalRepetitions: numRepetitions
                };

                try {
                    // Ejecutar k6 experiment (fire and forget - no esperar)
                    this.k6Service.createExperiment(k6PayloadWithRepetition, undefined, experimentId)
                        .catch(error => {
                            console.error(`Error creating k6 experiment for repetition ${repetition + 1}:`, error);
                        });

                    // Ejecutar chaos experiments si existen (fire and forget)
                    if (chaosExperiments && Array.isArray(chaosExperiments) && chaosExperiments.length > 0) {
                        for (const chaosExperiment of chaosExperiments) {
                            // Agregar número de repetición al nombre para evitar conflictos
                            const originalName = chaosExperiment.name || `chaos-${chaosExperiment.type}-${Date.now()}`;
                            const chaosNameWithRepetition = `${originalName}-rep${repetition + 1}`;
                            
                            const chaosExperimentWithId = {
                                ...chaosExperiment,
                                name: chaosNameWithRepetition,
                                experimentId: experimentId,
                                duration: k6Duration 
                            };
                            this.chaosService.createChaosExperiment(chaosExperimentWithId)
                                .catch(error => {
                                    console.error(`Error creating chaos experiment ${chaosNameWithRepetition}:`, error);
                                });
                        }
                    }

                    // Guardar en DB inmediatamente con fechas calculadas

                    // Guardar experimentos de k6
                    const servicios = k6Payload.servicios || [];
                    for (const servicio of servicios) {
                        const serviceName = servicio.nombre || servicio.name;
                        
                        // Obtener despliegue si existe
                        let despliegues: Despliegue[] = [];
                        if (servicio.id_despliegue) {
                            const despliegue = await this.despliegueService.findOne(servicio.id_despliegue);
                            if (despliegue) {
                                despliegues = [despliegue];
                            }
                        }

                        // Obtener endpoints
                        const endpoints = servicio.endpoints?.map((ep: any) => ep.url || ep.endpoint || '/') || [];

                        const baseExperimentName = servicios.length > 1 
                            ? `${k6Payload.nombre || 'Experimento'}-${serviceName}`
                            : (k6Payload.nombre || 'Experimento');
                        
                        const experimentName = `repeticion${repetition + 1}-${baseExperimentName}`;

                        const experimento = this.experimentoRepo.create({
                            nombre: experimentName,
                            duracion: k6Duration,
                            cant_replicas: numRepetitions,
                            endpoints: endpoints,
                            experiment_id: experimentId,
                            despliegues: despliegues,
                            carga: carga,
                            fecha_inicio: startTime,
                            fecha_fin: endTime,
                            numero_repeticion: repetition,
                        });

                        const saved = await this.experimentoRepo.save(experimento);
                        allSavedExperiments.push(saved);
                    }

                    // Guardar experimentos de chaos si existen
                    if (chaosExperiments && Array.isArray(chaosExperiments) && chaosExperiments.length > 0) {
                        for (const chaosExperiment of chaosExperiments) {
                            const baseChaosName = chaosExperiment.name || `${k6Payload.nombre || 'Chaos'}-${chaosExperiment.type}-${Date.now()}`;
                            const chaosExperimentName = `repeticion${repetition + 1}-${baseChaosName}`;
                            
                            const experimento = this.experimentoRepo.create({
                                nombre: chaosExperimentName,
                                duracion: k6Duration,
                                cant_replicas: numRepetitions,
                                endpoints: [],
                                tipo_chaos: chaosExperiment.type,
                                namespace: chaosExperiment.namespace || 'default',
                                experiment_id: experimentId,
                                configuracion_chaos: {
                                    selector: chaosExperiment.selector,
                                    mode: chaosExperiment.mode,
                                    value: chaosExperiment.value,
                                    networkDelay: chaosExperiment.networkDelay,
                                    networkLoss: chaosExperiment.networkLoss,
                                    networkBandwidth: chaosExperiment.networkBandwidth,
                                    stress: chaosExperiment.stress,
                                },
                                carga: carga,
                                fecha_inicio: startTime,
                                fecha_fin: endTime,
                                numero_repeticion: repetition,
                            });

                            const saved = await this.experimentoRepo.save(experimento);
                            allSavedExperiments.push(saved);
                        }
                    }

                    allResults.push({
                        experimentId: experimentId,
                        repetition: repetition,
                        startTime: startTime,
                        endTime: endTime,
                    });

                    console.log(`Repetición ${repetition + 1} de ${numRepetitions} iniciada y guardada en DB`);
                    console.log(`  - Fecha inicio: ${startTime.toISOString()}`);
                    console.log(`  - Fecha fin estimada: ${endTime.toISOString()}`);
                    console.log(`  - Duración del test: ${k6Duration} (${durationMs}ms)`);
                    console.log(`  - Overhead: ${overheadMs}ms`);

                } catch (error) {
                    console.error(`Error en repetición ${repetition + 1}:`, error);
                    // Continuar con la siguiente repetición aunque haya error
                }

                // Esperar duración del test + delay antes de iniciar la siguiente repetición
                // Esto asegura que cada repetición termine antes de que inicie la siguiente
                if (repetition < numRepetitions - 1) {
                    console.log(`Esperando ${totalWaitTimeMs}ms (duración: ${durationMs}ms + delay: ${delayMs}ms) antes de iniciar repetición ${repetition + 2}...`);
                    await new Promise(resolve => setTimeout(resolve, totalWaitTimeMs));
                }
            }

            console.log(`Todas las ${numRepetitions} repeticiones completadas`);

            return {
                message: 'Experimentos completados',
                totalRepetitions: numRepetitions,
                results: allResults,
                allSavedExperiments: allSavedExperiments,
            };
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas ejecutando el experimento: ${error}`,
            );
        }
    }
}
