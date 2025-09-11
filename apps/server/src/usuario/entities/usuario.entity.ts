import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolUsuario } from './rol-usuario.entity';
import { Proyecto } from '../../proyecto/entities/proyecto.entity';

@Entity()
export class Usuario {
    @PrimaryGeneratedColumn()
    id_usuario: number;

    @Column({ type: 'varchar', length: 100 })
    nombre: string;

    @Column({ type: 'varchar', length: 80 })
    correo: string;

    @Column({ type: 'integer'})
    documento: number;

    @Column({ type: 'varchar', length: 100 }) // La contraseña se cifra
    contrasena: string;

    @ManyToOne(() => RolUsuario, (rol_usuario) => rol_usuario.usuarios, {
        nullable: false,
    })
    @JoinColumn({ name: 'fk_id_rol_usuario' })
    rol: RolUsuario;

    @OneToMany(() => Proyecto, (proyecto) => proyecto.usuario)
    proyectos: Proyecto[];
}
