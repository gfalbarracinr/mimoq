import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExperimentRepetitionFields1764884634422 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'fecha_inicio'
                ) THEN
                    ALTER TABLE experimento ADD COLUMN fecha_inicio TIMESTAMP NULL;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'fecha_fin'
                ) THEN
                    ALTER TABLE experimento ADD COLUMN fecha_fin TIMESTAMP NULL;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'numero_repeticion'
                ) THEN
                    ALTER TABLE experimento ADD COLUMN numero_repeticion INTEGER NULL;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'numero_repeticion'
                ) THEN
                    ALTER TABLE experimento DROP COLUMN numero_repeticion;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'fecha_fin'
                ) THEN
                    ALTER TABLE experimento DROP COLUMN fecha_fin;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'fecha_inicio'
                ) THEN
                    ALTER TABLE experimento DROP COLUMN fecha_inicio;
                END IF;
            END $$;
        `);
    }

}

