import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Dinosaur } from '../models/Dinosaur';
import { Zone } from '../models/Zone';
import { Maintenance } from '../models/Maintenance';

dotenv.config({ path: '.env.test' });

// maintain one connection across all tests
export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Dinosaur, Zone, Maintenance],
  synchronize: true // similar ro refreshDatabase
});

// Global setup
beforeAll(async () => {
  await testDataSource.initialize();
});

// Global teardown
afterAll(async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
});