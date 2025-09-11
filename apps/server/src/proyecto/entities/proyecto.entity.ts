import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Despliegue } from './despliegue.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity()
export class Proyecto {
    @PrimaryGeneratedColumn()
    id_proyecto: number;

    @Column({ type: 'varchar', length: 40 })
    nombre: string;

    @Column({ type: 'varchar', length: 250 })
    descripcion: string;

    @Column({ type: 'varchar', length: 150, nullable: true})
    url_repositorio: string;

    @Column('varchar', { array: true, nullable: true })
    urls_repositorios: string[];

    @Column('varchar', { array: true, nullable: true })
    nombres_microservicios: string[];

    @Column({ type: 'boolean' })
    docker_compose: boolean;

    @Column({ type: 'boolean' })
    dockerfile: boolean;

    @Column('varchar', { array: true, nullable: true })
    imagenes_deploy: string[];

    @Column('integer', { array: true, nullable: true })
    puertos_imagenes: number[];

    @Column('integer', { array: true, nullable: true })
    puertos_deploy: number[];

    @ManyToOne(() => Usuario, (usuario) => usuario.proyectos)
    @JoinColumn({ name: 'fk_usuario' })
    usuario: Usuario;

    @OneToMany(() => Despliegue, (despliegue) => despliegue.proyecto)
    despliegues: Despliegue[];
}
