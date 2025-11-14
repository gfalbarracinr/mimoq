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

    async executeExperiment(payload: any) {
        try {
            const { chaosExperiments, ...k6Payload } = payload;

            const experimentId = `exp-${Date.now()}`;

            const k6Duration = this.calculateMaxK6Duration(k6Payload);

            const promises: Promise<any>[] = [];

            promises.push(this.k6Service.createExperiment(k6Payload, undefined, experimentId));

            if (chaosExperiments && Array.isArray(chaosExperiments) && chaosExperiments.length > 0) {
                for (const chaosExperiment of chaosExperiments) {

                    const chaosExperimentWithId = {
                        ...chaosExperiment,
                        experimentId: experimentId,
                        duration: k6Duration 
                    };
                    promises.push(
                        this.chaosService.createChaosExperiment(chaosExperimentWithId)
                            .catch(error => {
                                console.error(`Error creating chaos experiment ${chaosExperiment.name || 'unnamed'}:`, error);
                                return null;
                            })
                    );
                }
            }

            const results = await Promise.allSettled(promises);

            const k6Result = results[0];
            if (k6Result.status === 'rejected') {
                throw k6Result.reason;
            }
            
            const k6ResultData = k6Result.value;

            let carga = await this.cargaRepo.findOne({ where: {}, order: { id_carga: 'DESC' } });
            if (!carga) {
                
                carga = this.cargaRepo.create({
                    cant_usuarios: [],
                    duracion_picos: [],
                });
                carga = await this.cargaRepo.save(carga);
            }

            const savedK6Experiments = [];
            if (k6ResultData && k6ResultData.tests && Array.isArray(k6ResultData.tests)) {
                
                const testsByServicio = new Map<string, any[]>();
                
                for (const test of k6ResultData.tests) {
                    const key = `${test.servicio}-${test.namespace}`;
                    if (!testsByServicio.has(key)) {
                        testsByServicio.set(key, []);
                    }
                    testsByServicio.get(key)!.push(test);
                }

                for (const [key, tests] of testsByServicio.entries()) {
                    const firstTest = tests[0];
                    const servicio = k6Payload.servicios.find((s: any) => s.nombre === firstTest.servicio && s.namespace === firstTest.namespace);
                    
                    if (!servicio) continue;
                    
                    try {
                        
                        let despliegues: Despliegue[] = [];
                        if (servicio.id_despliegue) {
                            const despliegue = await this.despliegueService.findOne(servicio.id_despliegue);
                            if (despliegue) {
                                despliegues = [despliegue];
                            }
                        }

                        const endpoints = tests.map((test: any) => test.endpoint);

                        const experimentName = testsByServicio.size > 1 
                            ? `${k6Payload.nombre || firstTest.nombre}-${firstTest.servicio}`
                            : (k6Payload.nombre || firstTest.nombre);
                        
                        const experimento = this.experimentoRepo.create({
                            nombre: experimentName,
                            duracion: k6Duration,
                            cant_replicas: firstTest.replicas || k6Payload.replicas || 1,
                            endpoints: endpoints,
                            experiment_id: experimentId,
                            despliegues: despliegues,
                            carga: carga,
                        });
                        
                        const saved = await this.experimentoRepo.save(experimento);
                        savedK6Experiments.push(saved);
                    } catch (error) {
                        console.error(`Error saving K6 experiment to database:`, error);
                        
                    }
                }
            }

            const savedChaosExperiments = [];
            if (chaosExperiments && Array.isArray(chaosExperiments) && chaosExperiments.length > 0) {
                for (let i = 1; i < results.length; i++) {
                    const chaosResult = results[i];
                    if (chaosResult.status === 'fulfilled' && chaosResult.value) {
                        const chaosExperiment = chaosExperiments[i - 1];
                        const chaosResultData = chaosResult.value;
                        
                        try {
                            const experimento = this.experimentoRepo.create({
                                nombre: chaosExperiment.name || `${k6Payload.nombre || 'Chaos'}-${chaosExperiment.type}-${Date.now()}`,
                                duracion: k6Duration,
                                cant_replicas: 1, 
                                endpoints: [],
                                tipo_chaos: chaosExperiment.type,
                                namespace: chaosExperiment.namespace,
                                experiment_id: experimentId,
                                configuracion_chaos: {
                                    selector: chaosExperiment.selector,
                                    mode: chaosExperiment.mode,
                                    value: chaosExperiment.value,
                                    networkDelay: chaosExperiment.networkDelay,
                                    networkLoss: chaosExperiment.networkLoss,
                                    networkBandwidth: chaosExperiment.networkBandwidth,
                                    stress: chaosExperiment.stress,
                                    kubernetesName: chaosResultData.name,
                                },
                                carga: carga,
                            });
                            
                            const saved = await this.experimentoRepo.save(experimento);
                            savedChaosExperiments.push(saved);
                        } catch (error) {
                            console.error(`Error saving chaos experiment to database:`, error);
                            
                        }
                    }
                }
            }

            return {
                ...k6Result.value,
                experimentId: experimentId,
                k6Duration: k6Duration,
                savedK6Experiments: savedK6Experiments,
                savedChaosExperiments: savedChaosExperiments,
            };
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas ejecutando el experimento: ${error}`,
            );
        }
    }
}
