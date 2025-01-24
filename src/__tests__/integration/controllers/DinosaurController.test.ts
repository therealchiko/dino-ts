import request from 'supertest';
import app from '../../../app';
import { Dinosaur } from '../../../models/Dinosaur';
import { testDataSource } from '../../../test/setup';

describe('DinosaurController', () => {
  beforeEach(async () => {
    await testDataSource.createQueryRunner().query('TRUNCATE dinosaurs CASCADE');
  });

  describe('GET /api/dinosaurs', () => {
    it('should return all active dinosaurs', async () => {
      await testDataSource.getRepository(Dinosaur).save([
        {
          name: 'Rex',
          species: 'T-Rex',
          dinosaur_id: 1,
          park_id: 1,
          active: true
        },
        {
          name: 'Blue',
          species: 'Velociraptor',
          dinosaur_id: 2,
          park_id: 1,
          active: true
        },
        {
          name: 'Inactive',
          species: 'Triceratops',
          dinosaur_id: 3,
          park_id: 1,
          active: false
        }
      ]);

      const response = await request(app)
        .get('/api/dinosaurs')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Rex');
      expect(response.body[1].name).toBe('Blue');
    });
  });

  describe('GET /api/dinosaurs/:id', () => {
    it('should return a specific dinosaur by id', async () => {
      await testDataSource.getRepository(Dinosaur).save({
        name: 'Rex',
        species: 'T-Rex',
        dinosaur_id: 1,
        park_id: 1,
        active: true
      });

      const response = await request(app)
        .get('/api/dinosaurs/1')
        .expect(200);

      expect(response.body.name).toBe('Rex');
      expect(response.body.species).toBe('T-Rex');
    });

    it('should return 404 for non-existent dinosaur', async () => {
      const response = await request(app)
        .get('/api/dinosaurs/999')
        .expect(404);

      expect(response.body.error).toBe('Dinosaur not found');
    });

    it('should return 404 for inactive dinosaur', async () => {
      await testDataSource.getRepository(Dinosaur).save({
        name: 'Rex',
        species: 'T-Rex',
        dinosaur_id: 1,
        park_id: 1,
        active: false
      });

      const response = await request(app)
        .get('/api/dinosaurs/1')
        .expect(404);

      expect(response.body.error).toBe('Dinosaur not found');
    });
  });
});