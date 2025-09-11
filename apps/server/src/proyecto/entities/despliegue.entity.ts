import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Proyecto } from './proyecto.entity';

@Entity()
export class Despliegue {
    @PrimaryGeneratedColumn()
    id_despliegue: number;

    @Column({ type: 'varchar', length: 50 })
    nombre: string;

    @Column({ type: 'integer', nullable: true })
    cant_replicas: number;

    @Column({ type: 'integer', nullable: true })
    cant_pods: number;

    @Column({ type: 'varchar', length: 50 })
    namespace: string;

    @Column({ type: 'integer' })
    puerto: number;

    @Column({ type: 'boolean', nullable: true })
    autoescalado: boolean;

    @Column({ type: 'integer', nullable: true })
    min_replicas: number;

    @Column({ type: 'integer', nullable: true })
    max_replicas: number;

    @Column({ type: 'integer', nullable: true })
    utilization_cpu: number;

    @Column({ type: 'varchar', length: 50 })
    nombre_helm: string;

    @ManyToOne(() => Proyecto, (proyecto) => proyecto.despliegues, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'fk_proyecto' })
    proyecto: Proyecto;
}
