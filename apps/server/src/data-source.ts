import 'dotenv/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: 'ormconfig.env' });

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.TYPEORM_HOST,
    port: Number(process.env.TYPEORM_PORT),
    username: process.env.TYPEORM_USERNAME,
    password: process.env.TYPEORM_PASSWORD,
    database: process.env.TYPEORM_DATABASE,
    schema: process.env.TYPEORM_SCHEMA,
    synchronize: false,
    logging: true,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    migrationsTableName: 'migrations'
  });