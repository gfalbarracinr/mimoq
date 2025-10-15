import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedFile1758838464962 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO rol_usuario (id_rol, nombre)
            VALUES (2, 'admin')
            ON CONFLICT (id_rol) DO NOTHING;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM rol_usuario where id_rol = 2;
        `)
    }

}
