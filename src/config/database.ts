import 'dotenv/config';
import { DataSource } from "typeorm";
import { join } from "path";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: [join(__dirname, "../models/**/*.{ts,js}")],
  migrations: [join(__dirname, "../database/migrations/**/*.{ts,js}")],
  subscribers: [join(__dirname, "../subscribers/**/*.{ts,js}")]
});