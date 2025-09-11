import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Subatributo } from './subatributo.entity';

@Entity()
export class Metrica {
    @PrimaryGeneratedColumn()
    id_metrica: number;

    @Column({ type: 'varchar', length: 50 })
    nombre: string;

    @Column({ type: 'varchar', length: 500 })
    descripcion: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    formula: string;

    @Column({ type: 'varchar', length: 100 })
    nombre_prometheus: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    grupo: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    submetricas: string;

    @ManyToOne(() => Subatributo, (subatributo) => subatributo.metricas, {
        nullable: false,
    })
    @JoinColumn({ name: 'fk_id_subatributo' })
    subatributo: Subatributo;
}
