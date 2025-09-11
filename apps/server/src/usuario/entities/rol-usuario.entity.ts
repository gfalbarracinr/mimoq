import { Usuario } from '../entities/usuario.entity';
import { OneToMany, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class RolUsuario {
    @PrimaryGeneratedColumn()
    id_rol: number;
    @Column({ type: 'varchar', length: 50 })
    nombre: string;

    //Relaciones
    @OneToMany(() => Usuario, (usuario) => usuario.rol)
    usuarios: Usuario[];
}