import 'reflect-metadata';
import express from 'express';
import { json } from 'body-parser';
import { AppDataSource } from './config/database';

const app = express();

app.use(json());

AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established');
  })
  .catch((error) => {
    console.error('Error connecting to database:', error);
  });

export default app;