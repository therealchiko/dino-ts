
import { Dinosaur } from '../../../models/Dinosaur';
import { Zone } from '../../../models/Zone';
import { testDataSource } from '../../../test/setup';
import { subDays } from "date-fns";

describe('Zone', () => {
  beforeEach(async () => {
    await testDataSource.createQueryRunner().query('TRUNCATE zones, dinosaurs CASCADE');
  });

  describe('calculateMaintenanceStatus', () => {
    it('should set default values when no maintenance date exists', async () => {
      const zoneRepo = testDataSource.getRepository(Zone);
      const zone = zoneRepo.create({
        code: 'A1',
        park_id: 1,
      });
      await zoneRepo.save(zone);

      expect(zone.requiresMaintenance).toBe(false);
      expect(zone.daysSinceLastMaintenance).toBe(Infinity);
    });

    it('should calculate correct values for recent maintenance', async () => {
      const zoneRepo = testDataSource.getRepository(Zone);
      const zone = zoneRepo.create({
        code: 'A1',
        park_id: 1,
        last_maintenance: new Date()
      });
      await zoneRepo.save(zone);

      expect(zone.requiresMaintenance).toBe(false);
      expect(zone.daysSinceLastMaintenance).toBe(0);
    });

    it('should require maintenance after 30 days', async () => {
      const zone = await testDataSource.getRepository(Zone).create({
        code: 'A1',
        park_id: 1,
        last_maintenance: subDays(new Date(), 31)
      });

      await testDataSource.getRepository(Zone).save(zone);

      expect(zone.requiresMaintenance).toBe(true);
      expect(zone.daysSinceLastMaintenance).toBe(31);
    });
  });

  describe('isSafeForMaintenance', () => {
    it('should be true when maintenance not required but if habitable', async () => {
      const zoneRepo = testDataSource.getRepository(Zone);
      const zone = await zoneRepo.create({
        code: 'A1',
        park_id: 1,
        last_maintenance: new Date()
      });

      await zoneRepo.save(zone);

      expect(zone.isSafeForMaintenance()).toBe(true);
    });

    it('should be true when maintenance required and no occupant', async () => {
      const zoneRepo = testDataSource.getRepository(Zone);
      const zone = await zoneRepo.create({
        code: 'A1',
        park_id: 1,
        last_maintenance: subDays(new Date(), 31)
      });

      await zoneRepo.save(zone);

      expect(zone.isSafeForMaintenance()).toBe(true);
    });

    it('should depend on dinosaur safety when occupied', async () => {
      const zoneRepo = testDataSource.getRepository(Zone);
      const zone = await zoneRepo.create({
        code: 'A1',
        park_id: 1,
        last_maintenance: subDays(new Date(), 31)
      });
      await zoneRepo.save(zone);

      const safeDino = await testDataSource.getRepository(Dinosaur).create({
        name: 'Herb',
        species: 'Triceratops',
        herbivore: true,
        dinosaur_id: 1,
        park_id: 1,
        active: true,
        location_code: zone.code
      });
      await testDataSource.getRepository(Dinosaur).save(safeDino);

      const zoneWithSafeDino = await zoneRepo.findOne({
        where: { code: zone.code },
      });

      expect(zoneWithSafeDino!.isSafeForMaintenance()).toBe(true);

      const zone2 = await zoneRepo.create({
        code: 'A2',
        park_id: 1,
        last_maintenance: subDays(new Date(), 31)
      });
      await zoneRepo.save(zone2);
      
      // Create unsafe dino
      const unSafeDino = await testDataSource.getRepository(Dinosaur).create({
        name: 'Rex',
        species: 'T-Rex',
        herbivore: false,
        last_fed: subDays(new Date(), 3),
        digestion_period_in_hours: 48,
        dinosaur_id: 4,
        park_id: 1,
        active: true,
        location_code: zone2.code
      });
      await testDataSource.getRepository(Dinosaur).save(unSafeDino);

      const zoneWithUnsafeDino = await zoneRepo.findOne({
        where: { code: zone2.code },
      });

      expect(zoneWithUnsafeDino!.isSafeForMaintenance()).toBe(false);
    });
});

  describe('getStatus', () => {
    it('should return correct status for empty zone', async () => {
      const zone = await testDataSource.getRepository(Zone).create({
        code: 'A1',
        park_id: 1,
        last_maintenance: subDays(new Date(), 10)
      });
      await testDataSource.getRepository(Zone).save(zone);

      const status = zone.getStatus();

      expect(status).toEqual({
        code: 'A1',
        maintenance: {
          required: false,
          daysSinceLastMaintenance: 10,
          safeForMaintenance: true
        },
        occupancy: {
          hasOccupant: false,
          isSafe: true,
          details: null
        }
      });
    });

    it('should return correct status with occupant', async () => {
      const zone = await testDataSource.getRepository(Zone).create({
        code: 'A1',
        park_id: 1,
        last_maintenance: subDays(new Date(), 10)
      });
      await testDataSource.getRepository(Zone).save(zone);

      const dino = await testDataSource.getRepository(Dinosaur).create({
        name: 'Rex',
        species: 'T-Rex',
        herbivore: false,
        last_fed: new Date(),
        digestion_period_in_hours: 48,
        dinosaur_id: 1,
        park_id: 1,
        location_code: zone.code,
        active: true
      });
      await testDataSource.getRepository(Dinosaur).save(dino);

      const reloadedZone = await testDataSource.getRepository(Zone).findOne({
        where: { code: zone.code },
      });
      const status = reloadedZone!.getStatus();

      expect(status.occupancy).toEqual({
        hasOccupant: true,
        isSafe: true,
        details: {
          name: 'Rex',
          species: 'T-Rex',
          herbivore: false,
          isDigesting: true,
          digestionPeriodInHours: 48
        }
      });
    });
  });
});