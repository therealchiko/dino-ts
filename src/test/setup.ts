import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Dinosaur } from '../models/Dinosaur';
import { EventLog } from '../models/EventLog';
import { Maintenance } from '../models/Maintenance';
import { Zone } from '../models/Zone';
dotenv.config({ path: '.env.test' });

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Dinosaur, Zone, Maintenance, EventLog],
  synchronize: true // similar ro refreshDatabase
});

beforeAll(async () => {
  await testDataSource.initialize();
});

afterAll(async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
});