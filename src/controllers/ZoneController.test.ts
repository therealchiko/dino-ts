import request from 'supertest';
import app from "../app";
import { Maintenance } from "../models/Maintenance";
import { Zone } from "../models/Zone";
import { testDataSource } from "../test/setup";

describe('ZoneController Tests', () => {
    beforeEach(async () => {
    await testDataSource.createQueryRunner().query('TRUNCATE zones, maintenance CASCADE');
  });

  describe('GET /api/zones', () => {
    it('should return all zones', async () => {
      await testDataSource.getRepository(Zone).save([
        {
          code: 'A1',
          park_id: 1,
          last_maintenance: new Date('2024-03-10')
        },
        {
          code: 'B2',
          park_id: 1,
          last_maintenance: new Date('2024-03-09')
        }
      ]);

      const response = await request(app)
        .get('/api/zones')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].code).toBe('A1');
      expect(response.body[1].code).toBe('B2');
    });
  });

  describe('GET /api/zones/:code', () => {
    it('should return zone with maintenance history', async () => {
      const zone = await testDataSource.getRepository(Zone).save({
        code: 'A1',
        park_id: 1,
        last_maintenance: new Date('2024-03-10')
      });

      await testDataSource.getRepository(Maintenance).save([
        {
          location: 'A1',
          park_id: 1,
          performed_at: new Date('2024-03-10')
        },
        {
          location: 'A1',
          park_id: 1,
          performed_at: new Date('2024-03-09')
        }
      ]);

      const response = await request(app)
        .get('/api/zones/A1')
        .expect(200);

      expect(response.body.code).toBe('A1');
      expect(response.body.maintenance_history).toHaveLength(2);
      expect(response.body.maintenance_history[0].location).toBe('A1');
    });

    it('should return 404 for non-existent zone', async () => {
      const response = await request(app)
        .get('/api/zones/Z99')
        .expect(404);

      expect(response.body.error).toBe('Zone not found');
    });
  });
});