import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: 'public',
  synchronize: false,
  logging: true,
  entities: ['dist/**/*.entity.js'],
  migrations: [ __dirname + '/database/migrations/*{.ts, .js}'],
  migrationsTableName: 'migrations',
});
