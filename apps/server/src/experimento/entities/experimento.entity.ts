import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Carga } from './carga.entity';
import { Despliegue } from '../../proyecto/entities/despliegue.entity';
import { Metrica } from '../../metrica/entities/metrica.entity';

@Entity()
export class Experimento {
    @PrimaryGeneratedColumn()
    id_experimento: number;

    @Column({ type: 'varchar', length: 70, nullable: true })
    nombre: string;

    @Column({ type: 'varchar', length: 5 })
    duracion: string;

    @Column({ type: 'integer' })
    cant_replicas: number;

    @Column('varchar', { array: true })
    endpoints: string[];

    @Column('varchar', { array: true, nullable: true })
    nombres_archivos: string[];

    @Column('varchar', { array: true, nullable: true })
    iframes: string[];

    @Column('varchar', { array: true, nullable: true })
    tiempo_escalado: string[];

    @ManyToOne(() => Carga, (carga) => carga.experimentos)
    @JoinColumn({ name: 'fk_id_carga' })
    carga: Carga;

    @ManyToMany(() => Despliegue)
    @JoinTable()
    despliegues: Despliegue[];

    @ManyToMany(() => Metrica)
    @JoinTable()
    metricas: Metrica[];
}
