import * as dotenv from "dotenv";
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";

dotenv.config();

/**
 * Shared connection options for the app, the seed script and the TypeORM CLI.
 *
 * Schema changes are applied by migrations (src/database/migrations), which run
 * automatically when the app starts. `synchronize` is only for local development.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_DATABASE || "boa_db",
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  migrationsRun: true,
  synchronize: process.env.DB_SYNCHRONIZE === "true",
  logging: process.env.NODE_ENV === "development" ? ["error", "warn", "migration"] : ["error", "migration"],
};

export default new DataSource(dataSourceOptions);
