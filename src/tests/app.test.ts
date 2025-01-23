import request from 'supertest';
import app from '../app';

describe('App', () => {
  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});