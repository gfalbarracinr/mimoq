import { OneToMany, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Metrica } from './metrica.entity';
import { Subatributo } from './subatributo.entity';

@Entity()
export class Atributo {
    @PrimaryGeneratedColumn()
    id_atributo: number;

    @Column({ type: 'varchar', length: 50 })
    nombre: string;

    @Column({ type: 'varchar', length: 200 })
    descripcion: string;

    @OneToMany(() => Subatributo, (subatributo) => subatributo.atributo)
    subatributos: Subatributo[];
}