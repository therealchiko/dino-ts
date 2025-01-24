import { subHours } from "date-fns";
import { DataSource } from "typeorm";
import { Dinosaur } from "../../../models/Dinosaur";
import { EventLog } from "../../../models/EventLog";
import { Maintenance } from "../../../models/Maintenance";
import { Zone } from "../../../models/Zone";
import { EventProcessor } from "../../../services/EventProcessor";
import { testDataSource } from "../../../test/setup";


describe('EventProcessor', () => {
  let processor: EventProcessor;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = testDataSource;
    processor = new EventProcessor(dataSource);
  });

  beforeEach(async () => {
    await dataSource.createQueryRunner().query('TRUNCATE dinosaurs, zones, maintenance, event_log CASCADE');
    await dataSource.getRepository(Zone).save({
      code: 'A1',
      park_id: 1
    });
  });

  describe('handle updates where time should only be newer', () => {
    it('should only update feeding time if event is newer', async () => {
      const now = new Date();
      const oldFeedingTime = subHours(now, 2);
      const newFeedingTime = subHours(now, 1);

      // Create test dinosaur
      await dataSource.getRepository(Dinosaur).save({
        name: 'Rex',
        species: 'T-Rex',
        dinosaur_id: 1,
        park_id: 1,
        active: true,
        last_fed: oldFeedingTime
      });

      // Create event logs
      const newEvent = await dataSource.getRepository(EventLog).save({
        kind: 'dino_fed',
        dinosaur_id: 1,
        park_id: 1,
        time: newFeedingTime,
        raw_event: {
          kind: 'dino_fed',
          dinosaur_id: 1,
          park_id: 1,
          time: newFeedingTime.toISOString()
        }
      });

      const oldEvent = await dataSource.getRepository(EventLog).save({
        kind: 'dino_fed',
        dinosaur_id: 1,
        park_id: 1,
        time: oldFeedingTime,
        raw_event: {
          kind: 'dino_fed',
          dinosaur_id: 1,
          park_id: 1,
          time: oldFeedingTime.toISOString()
        }
      });

      // Process events
      await processor.processEvent(newEvent);
      await processor.processEvent(oldEvent);

      const dino = await dataSource.getRepository(Dinosaur).findOne({
        where: { dinosaur_id: 1 }
      });

      expect(dino?.last_fed).toEqual(newFeedingTime);
    });

    it('should only update location if event is newer', async () => {
      const now = new Date();
      const oldMoveTime = subHours(now, 2);
      const newMoveTime = subHours(now, 1);

      // Create second zone
      await dataSource.getRepository(Zone).save({
        code: 'B1',
        park_id: 1
      });

      // Create dinosaur
      await dataSource.getRepository(Dinosaur).save({
        name: 'Rex',
        species: 'T-Rex',
        dinosaur_id: 1,
        park_id: 1,
        active: true,
        location_code: 'A1', 
        updated_at: oldMoveTime
      });

      // Create event logs
      const newEvent = await dataSource.getRepository(EventLog).save({
        kind: 'dino_location_updated',
        dinosaur_id: 1,
        park_id: 1,
        location: 'B1', 
        time: newMoveTime,
        raw_event: {
          kind: 'dino_location_updated',
          dinosaur_id: 1,
          park_id: 1,
          location: 'B1',
          time: newMoveTime.toISOString()
        }
      });

      const oldEvent = await dataSource.getRepository(EventLog).save({
        kind: 'dino_location_updated',
        dinosaur_id: 1,
        park_id: 1,
        location: 'A1',
        time: oldMoveTime,
        raw_event: {
          kind: 'dino_location_updated',
          dinosaur_id: 1,
          park_id: 1,
          location: 'A1',
          time: oldMoveTime.toISOString()
        }
      });

      await processor.processEvent(newEvent);
      await processor.processEvent(oldEvent);

      const dino = await dataSource.getRepository(Dinosaur).findOne({
        where: { dinosaur_id: 1 }
      });

      expect(dino?.location_code).toBe('B1');  // Changed from location to location_code
      expect(dino?.updated_at).toEqual(newMoveTime);
    });
  });

  it('should add a new dinosaur', async () => {
      const eventLog = await dataSource.getRepository(EventLog).save({
        kind: 'dino_added',
        name: 'Rex',
        species: 'T-Rex',
        gender: 'male',
        dinosaur_id: 1,
        digestion_period_in_hours: 48,
        herbivore: false,
        park_id: 1,
        time: new Date(),
        raw_event: {
          kind: 'dino_added',
          name: 'Rex',
          species: 'T-Rex',
          gender: 'male',
          id: 1,
          digestion_period_in_hours: 48,
          herbivore: false,
          park_id: 1,
          time: new Date().toISOString()
        }
      });
  
      await processor.processEvent(eventLog);
  
      const dino = await dataSource.getRepository(Dinosaur).findOne({
        where: { dinosaur_id: 1 }
      });
  
      expect(dino).toBeDefined();
      expect(dino?.name).toBe('Rex');
      expect(dino?.active).toBe(true);
    });
  
    it('should mark dinosaur as inactive when removed', async () => {
      // Create dinosaur first
      await dataSource.getRepository(Dinosaur).save({
        name: 'Rex',
        species: 'T-Rex',
        dinosaur_id: 1,
        park_id: 1,
        active: true
      });
  
      const eventLog = await dataSource.getRepository(EventLog).save({
        kind: 'dino_removed',
        dinosaur_id: 1,
        park_id: 1,
        time: new Date(),
        raw_event: {
          kind: 'dino_removed',
          dinosaur_id: 1,
          park_id: 1,
          time: new Date().toISOString()
        }
      });
  
      await processor.processEvent(eventLog);
  
      const dino = await dataSource.getRepository(Dinosaur).findOne({
        where: { dinosaur_id: 1 }
      });
  
      expect(dino?.active).toBe(false);
    });
  
    it('should record maintenance', async () => {
      const maintenanceTime = new Date();
      const eventLog = await dataSource.getRepository(EventLog).save({
        kind: 'maintenance_performed',
        location: 'A1',  // This stays as location in events
        park_id: 1,
        time: maintenanceTime,
        raw_event: {
          kind: 'maintenance_performed',
          location: 'A1',
          park_id: 1,
          time: maintenanceTime.toISOString()
        }
      });

      await processor.processEvent(eventLog);

      const [maintenance, zone] = await Promise.all([
        dataSource.getRepository(Maintenance).findOne({
          where: { location: 'A1' }  // Maintenance table still uses location
        }),
        dataSource.getRepository(Zone).findOne({
          where: { code: 'A1' }  // Zone uses code
        })
      ]);

      expect(maintenance?.performed_at).toEqual(maintenanceTime);
      expect(zone?.last_maintenance).toEqual(maintenanceTime);
    });
  
    it('should throw error for invalid zone in maintenance', async () => {
      const eventLog = await dataSource.getRepository(EventLog).save({
        kind: 'maintenance_performed',
        location: 'INVALID',
        park_id: 1,
        time: new Date(),
        raw_event: {
          kind: 'maintenance_performed',
          location: 'INVALID',
          park_id: 1,
          time: new Date().toISOString()
        }
      });
  
      await expect(processor.processEvent(eventLog)).rejects.toThrow('Invalid zone location');
    });
  });
