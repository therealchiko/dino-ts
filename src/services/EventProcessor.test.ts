import { DataSource } from 'typeorm';
import { EventProcessor } from './EventProcessor';
import { Dinosaur } from '../models/Dinosaur';
import { Zone } from '../models/Zone';
import { FeedEvent } from '../types/events';
import { testDataSource } from '../test/setup';

describe('EventProcessor', () => {
  let processor: EventProcessor;

  beforeEach(async () => {
    processor = new EventProcessor(testDataSource);
    // for(const table of ['dinosaurs', 'zones', 'maintenance']) {
    //   await testDataSource.createQueryRunner().query(`TRUNCATE ${table} CASCADE`);
    // }
    await testDataSource.createQueryRunner().query('TRUNCATE dinosaurs, zones, maintenance CASCADE');
    await testDataSource.getRepository(Zone).save({
      code: 'A1',
      park_id: 1
    });
  });

  const createDinosaur = async () => {
    await testDataSource.getRepository(Dinosaur).save({
      name: 'Rex',
      species: 'T-Rex',
      dinosaur_id: 1,
      park_id: 1,
      active: true
    });
  }

  it('should add a new dinosaur', async () => {
    const event: FeedEvent = {
      kind: 'dino_added',
      name: 'Rex',
      species: 'T-Rex',
      gender: 'male',
      id: 1,
      digestion_period_in_hours: 48,
      herbivore: false,
      park_id: 1,
      time: '2024-03-10T10:00:00Z'
    };

    await processor.processEvent(event);

    const dino = await testDataSource.getRepository(Dinosaur).findOne({
      where: { dinosaur_id: 1 }
    });

    expect(dino).toBeDefined();
    expect(dino?.name).toBe('Rex');
    expect(dino?.active).toBe(true);
  });

  it('should update dinosaur location', async () => {
    await createDinosaur();

    const event: FeedEvent = {
      kind: 'dino_location_updated',
      location: 'A1',
      dinosaur_id: 1,
      park_id: 1,
      time: '2024-03-10T10:00:00Z'
    };

    await processor.processEvent(event);

    const dino = await testDataSource.getRepository(Dinosaur).findOne({
      where: { dinosaur_id: 1 }
    });

    expect(dino?.location).toBe('A1');
  });

  it('should throw error for invalid zone', async () => {
    const event: FeedEvent = {
      kind: 'dino_location_updated',
      location: 'Z99',
      dinosaur_id: 1,
      park_id: 1,
      time: '2024-03-10T10:00:00Z'
    };

    await expect(processor.processEvent(event)).rejects.toThrow('Invalid zone location');
  });

  it('should mark dinosaur as inactive when removed', async () => {
    await createDinosaur();

    const event: FeedEvent = {
      kind: 'dino_removed',
      dinosaur_id: 1,
      park_id: 1,
      time: '2024-03-10T10:00:00Z'
    };

    await processor.processEvent(event);

    const dino = await testDataSource.getRepository(Dinosaur).findOne({
      where: { dinosaur_id: 1 }
    });

    expect(dino?.active).toBe(false);
  });
});