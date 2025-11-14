import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChaosExperimentFields1762551464968 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'tipo_chaos'
                ) THEN
                    ALTER TABLE experimento ADD COLUMN tipo_chaos VARCHAR(50) NULL;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'namespace'
                ) THEN
                    ALTER TABLE experimento ADD COLUMN namespace VARCHAR(100) NULL;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'configuracion_chaos'
                ) THEN
                    ALTER TABLE experimento ADD COLUMN configuracion_chaos JSONB NULL;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'experiment_id'
                ) THEN
                    ALTER TABLE experimento ADD COLUMN experiment_id VARCHAR(100) NULL;
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
                    WHERE table_name = 'experimento' AND column_name = 'experiment_id'
                ) THEN
                    ALTER TABLE experimento DROP COLUMN experiment_id;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'configuracion_chaos'
                ) THEN
                    ALTER TABLE experimento DROP COLUMN configuracion_chaos;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'namespace'
                ) THEN
                    ALTER TABLE experimento DROP COLUMN namespace;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'experimento' AND column_name = 'tipo_chaos'
                ) THEN
                    ALTER TABLE experimento DROP COLUMN tipo_chaos;
                END IF;
            END $$;
        `);
    }

}

