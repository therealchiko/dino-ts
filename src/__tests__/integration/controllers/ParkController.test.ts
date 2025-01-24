import { subHours } from "date-fns";
import { ParkController } from "../../../controllers/ParkController";
import { Dinosaur } from "../../../models/Dinosaur";
import { EventLog } from "../../../models/EventLog";
import { Zone } from "../../../models/Zone";
import { CacheService } from "../../../services/CacheService";
import { EventProcessor } from "../../../services/EventProcessor";
import { testDataSource } from "../../../test/setup";
import app from "../../../app";
import request from 'supertest';

describe('ParkController', () => {
  let eventProcessor: EventProcessor;

  beforeEach(async () => {
    await testDataSource.createQueryRunner().query('TRUNCATE zones, dinosaurs CASCADE');
    eventProcessor = new EventProcessor(testDataSource);

    // invalidate cache so that we don't have any spill over into other tests...
    CacheService.invalidate(ParkController.CACHE_KEY);
  });

  describe('GET /api/park/status', () => {
    it('should return detailed herbivore status', async () => {
      const zone = await testDataSource.getRepository(Zone).save({
        code: 'A1',
        park_id: 1,
        last_maintenance: new Date()
      });

      await testDataSource.getRepository(Dinosaur).save({
        name: 'Herb',
        species: 'Triceratops',
        dinosaur_id: 1,
        park_id: 1,
        active: true,
        location_code: 'A1',
        herbivore: true,
        last_fed: new Date(),
        digestion_period_in_hours: 24
      });

      const response = await request(app)
        .get('/api/park/status')
        .expect(200);

      const responseZone = response.body.zones[0];
      expect(responseZone.occupancy).toMatchObject({
        hasOccupant: true,
        isSafe: true,
        details: {
          name: 'Herb',
          species: 'Triceratops',
          herbivore: true,
          isDigesting: true
        }
      });
      expect(response.body.stats.occupiedZones).toBe(1);
    });

    it('should show digestion statuses', async () => {
      const zone = await testDataSource.getRepository(Zone).save({
        code: 'B2',
        park_id: 1,
        last_maintenance: new Date()
      });

      const digestionPeriod = 48;
      await testDataSource.getRepository(Dinosaur).save({
        name: 'Rex',
        species: 'T-Rex',
        dinosaur_id: 2,
        park_id: 1,
        active: true,
        location_code: 'B2',
        herbivore: false,
        last_fed: subHours(new Date(), digestionPeriod - 1),
        digestion_period_in_hours: digestionPeriod
      });

      const response = await request(app)
        .get('/api/park/status')
        .expect(200);

      const responseZone = response.body.zones[0];
      expect(responseZone.occupancy).toMatchObject({
        hasOccupant: true,
        isSafe: true,
        details: {
          name: 'Rex',
          species: 'T-Rex',
          herbivore: false,
          isDigesting: true,
          digestionPeriodInHours: digestionPeriod
        }
      });
    });

    it('should handle hungry carnivore status', async () => {
      // Clear any existing data
      await testDataSource.createQueryRunner().query('TRUNCATE zones, dinosaurs CASCADE');
      
      await testDataSource.getRepository(Zone).save({
        code: 'C3',
        park_id: 1,
        last_maintenance: new Date()
      });

      const digestionPeriod = 48;
      await testDataSource.getRepository(Dinosaur).save({
        name: 'Rex',
        species: 'T-Rex',
        dinosaur_id: 3,
        park_id: 1,
        active: true,
        location_code: 'C3',
        herbivore: false,
        last_fed: subHours(new Date(), digestionPeriod + 1),
        digestion_period_in_hours: digestionPeriod
      });

      const response = await request(app)
        .get('/api/park/status')
        .expect(200);

      const zone = response.body.zones[0];
      expect(zone.occupancy).toMatchObject({
        hasOccupant: true,
        isSafe: false,
        details: {
          name: 'Rex',
          species: 'T-Rex',
          herbivore: false,
          isDigesting: false,
          digestionPeriodInHours: digestionPeriod
        }
      });
    });
  });

  describe('Caching behavior', () => {
    it('should cache park status and return cached version on subsequent requests', async () => {
      await testDataSource.getRepository(Zone).save({
        code: 'A1',
        park_id: 1,
        last_maintenance: new Date()
      });

      // First - should hit database
      const response1 = await request(app)
        .get('/api/park/status')
        .expect(200);

      // Second - should use cache
      const response2 = await request(app)
        .get('/api/park/status')
        .expect(200);

      expect(response1.body).toEqual(response2.body);
    });

    it('should invalidate cache when processing new events', async () => {
      await testDataSource.getRepository(Zone).save({
        code: 'A1',
        park_id: 1,
        last_maintenance: new Date()
      });

      // Get initial status
      const response1 = await request(app)
        .get('/api/park/status')
        .expect(200);

      const event = {
        kind: 'dino_added',
        name: 'Rex',
        species: 'T-Rex',
        gender: 'male',
        id: 1,
        digestion_period_in_hours: 48,
        herbivore: false,
        park_id: 1,
        time: new Date(),
      };

      // Process a new event
      await eventProcessor.processEvent({
        ...event,
        raw_event: {
          ...event
        }
      } as EventLog);

      const locationUpdatedEvent = {
        kind: 'dino_location_updated',
        dinosaur_id: 1,
        time: new Date(),
        location: 'A1',
        park_id: 1,
      };

      // moved Rex to A1
      await eventProcessor.processEvent({
        ...locationUpdatedEvent,
        raw_event: {
          ...locationUpdatedEvent
        }
      } as EventLog)

      // Get status again - should reflect new dinosaur
      const response2 = await request(app)
        .get('/api/park/status')
        .expect(200);

      // Verify cache was invalidated and new data is returned
      expect(response1.body.stats.occupiedZones).toBe(0);
      expect(response2.body.stats.occupiedZones).toBe(1);
      expect(response2.body.zones[0].occupancy.details).toMatchObject({
        name: 'Rex',
        species: 'T-Rex'
      });
    });

    it('should maintain cache for the specified time', async () => {
      await testDataSource.getRepository(Zone).save({
        code: 'A1',
        park_id: 1,
        last_maintenance: new Date()
      });

      // First request
      await request(app)
        .get('/api/park/status')
        .expect(200);

      // Manually clear cache
      CacheService.invalidate(ParkController.CACHE_KEY);

      // Add new zone after cache is cleared
      await testDataSource.getRepository(Zone).save({
        code: 'B2',
        park_id: 1,
        last_maintenance: new Date()
      });

      // Next request should show updated data
      const response = await request(app)
        .get('/api/park/status')
        .expect(200);

      expect(response.body.zones.length).toBe(2);
    });
  });
});