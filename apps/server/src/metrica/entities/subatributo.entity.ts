import { OneToMany, Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Metrica } from './metrica.entity';
import { Atributo } from './atributo.entity';

@Entity()
export class Subatributo {
    @PrimaryGeneratedColumn()
    id_subatributo: number;

    @Column({ type: 'varchar', length: 50 })
    nombre: string;

    @Column({ type: 'varchar', length: 200 })
    descripcion: string;

    @ManyToOne(() => Atributo, (atributo) => atributo.subatributos, {
        nullable: false,
    })
    @JoinColumn({ name: 'fk_id_atributo' })
    atributo: Atributo;

    @OneToMany(() => Metrica, (metrica) => metrica.subatributo)
    metricas: Metrica[];
}