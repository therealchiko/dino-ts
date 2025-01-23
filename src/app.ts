import 'reflect-metadata';
import express from 'express';
import { json } from 'body-parser';
import { AppDataSource } from './config/database';
import dinosaurRoutes from './routes/dinosaur.routes';
import zoneRoutes from './routes/zone.routes';
import parkRoutes from './routes/park.routes';

const app = express();

app.use(json());
app.use('/api', dinosaurRoutes);
app.use('/api', zoneRoutes);
app.use('/api', parkRoutes);

AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established');
  })
  .catch((error) => {
    console.error('Error connecting to database:', error);
  });

export default app;