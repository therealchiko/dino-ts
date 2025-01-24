import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Dinosaur } from '../models/Dinosaur';
import { Maintenance } from '../models/Maintenance';
import { Zone } from '../models/Zone';
import { DinoAddedEvent, DinoFedEvent, DinoLocationEvent, DinoRemovedEvent, FeedEvent, MaintenanceEvent } from '../types/events';
import { CacheService } from './CacheService';
import { ParkController } from '../controllers/ParkController';
import { EventLog } from '../models/EventLog';
import dayjs from 'dayjs';

export class EventProcessor {
  private dinoRepo: Repository<Dinosaur>;
  private maintenanceRepo: Repository<Maintenance>;
  private zoneRepo: Repository<Zone>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.dinoRepo = dataSource.getRepository(Dinosaur);
    this.maintenanceRepo = dataSource.getRepository(Maintenance);
    this.zoneRepo = dataSource.getRepository(Zone);
  }

  async processEvent(event: EventLog): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // If this is a location update, check if the dinosaur exists first
      if (event.kind === 'dino_location_updated') {
        const rawEvent = event.raw_event as DinoLocationEvent;
        const dino = await queryRunner.manager.findOne(Dinosaur, {
          where: { dinosaur_id: rawEvent.dinosaur_id }
        });

        if (!dino) {
          // Find and process the dino_added event first
          const addEvent = await queryRunner.manager.findOne(EventLog, {
            where: {
              kind: 'dino_added',
              raw_event: { id: rawEvent.dinosaur_id }
            },
            order: { time: 'ASC' }
          });

          if (addEvent) {
            await this.handleDinoAdded(addEvent, queryRunner);
            // we still need to add location because it's not handled by dino_added
            await this.handleDinoLocation(event, queryRunner);
          }
        }
      }

      // Process the current event
      switch (event.kind) {
        case 'dino_added':
          // console.log("adding dino");
          await this.handleDinoAdded(event, queryRunner);
          break;
        case 'dino_fed':
          await this.handleDinoFed(event, queryRunner);
          break;
        case 'dino_location_updated':
          await this.handleDinoLocation(event, queryRunner);
          break;
        case 'dino_removed':
          await this.handleDinoRemoved(event, queryRunner);
          break;
        case 'maintenance_performed':
          await this.handleMaintenance(event, queryRunner);
          break;
      }
      await queryRunner.commitTransaction();
      CacheService.invalidate(ParkController.CACHE_KEY);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handleDinoAdded(event: EventLog, queryRunner: QueryRunner): Promise<void> {
    const rawEvent = event.raw_event as DinoAddedEvent;
    const existingDino = await queryRunner.manager.findOne(Dinosaur, {
      where: { dinosaur_id: rawEvent.id }
    });

    if (existingDino) {
      return;
    }

    const dino = queryRunner.manager.create(Dinosaur, {
      name: rawEvent.name,
      created_at: event.time,
      updated_at: event.time,
      gender: rawEvent.gender,
      park_id: rawEvent.park_id,
      species: rawEvent.species,
      dinosaur_id: rawEvent.id,
      herbivore: rawEvent.herbivore,
      digestion_period_in_hours: rawEvent.digestion_period_in_hours,
      active: true,
    });
    await queryRunner.manager.save(Dinosaur, dino);
  }

  private async handleDinoFed(event: EventLog, queryRunner: QueryRunner): Promise<void> {
    const rawEvent = event.raw_event as DinoFedEvent;
    const dino = await queryRunner.manager.findOne(Dinosaur, {
      where: { dinosaur_id: rawEvent.dinosaur_id, active: true }
    });

    if (!dino) {
      throw new Error(`Dinosaur ${rawEvent.dinosaur_id} not found or not active`);
    }

    if (!dino.last_fed || event.time > dino.last_fed) {
      const result = await queryRunner.manager.update(Dinosaur, 
        { dinosaur_id: rawEvent.dinosaur_id, active: true },
        { last_fed: event.time }
      );

      if (result.affected === 0) {
        throw new Error(`Failed to update feeding time for dinosaur ${rawEvent.dinosaur_id}`);
      }
    }
  }

  private async handleDinoLocation(event: EventLog, queryRunner: QueryRunner): Promise<void> {
    const rawEvent = event.raw_event as DinoLocationEvent;
    // console.log('Processing location update:', {
    //   event_id: event.id,
    //   dinosaur_id: rawEvent.dinosaur_id,
    //   location: rawEvent.location,
    //   time: event.time
    // });

    const [zone, dino] = await Promise.all([
      queryRunner.manager.findOne(Zone, {
        where: { code: rawEvent.location }
      }),
      queryRunner.manager.findOne(Dinosaur, {
        where: { dinosaur_id: rawEvent.dinosaur_id, active: true }
      })
    ]);

    if (!zone) {
      throw new Error(`Invalid zone location: ${rawEvent.location}`);
    }

    if (!dino) {
      throw new Error(`Dinosaur ${rawEvent.dinosaur_id} not found or not active`);
    }

    // Let's add some debugging
    // console.log('Updating location:', {
    //   dinosaur_id: rawEvent.dinosaur_id,
    //   oldLocation: dino.location,
    //   newLocation: rawEvent.location,
    //   eventTime: event.time,
    //   lastUpdate: dino.updated_at
    // });
    
    
    if (!dino.updated_at || dayjs(event.time).isAfter(dayjs(dino.updated_at))) {
      const result = await queryRunner.manager.update(Dinosaur,
        { dinosaur_id: rawEvent.dinosaur_id, active: true },
        { 
          location_code: rawEvent.location,
          updated_at: event.time
        }
      );

      if (result.affected === 0) {
        throw new Error(`Failed to update location for dinosaur ${rawEvent.dinosaur_id}`);
      }
    }
  }

  private async handleDinoRemoved(event: EventLog, queryRunner: QueryRunner): Promise<void> {
    const rawEvent = event.raw_event as DinoRemovedEvent;
    const result = await queryRunner.manager.update(Dinosaur,
      { dinosaur_id: rawEvent.dinosaur_id, active: true },
      { active: false }
    );

    if (result.affected === 0) {
      throw new Error(`Dinosaur ${rawEvent.dinosaur_id} not found or already inactive`);
    }
  }

  private async handleMaintenance(event: EventLog, queryRunner: QueryRunner): Promise<void> {
    const rawEvent = event.raw_event as MaintenanceEvent;
    // Load zone without relations to avoid the eager loading issue
    const zone = await queryRunner.manager.findOne(Zone, {
      select: ['id', 'code'],  // Only select needed fields
      where: { code: rawEvent.location }
    });

    if (!zone) {
      throw new Error(`Invalid zone location: ${rawEvent.location}`);
    }

    const maintenance = queryRunner.manager.create(Maintenance, {
      location: rawEvent.location,
      park_id: rawEvent.park_id,
      performed_at: event.time,
      zone: zone  // Set the relationship
    });
    await queryRunner.manager.save(Maintenance, maintenance);

    // Update zone's last maintenance date
    await queryRunner.manager.update(Zone,
      { code: rawEvent.location },
      { last_maintenance: event.time }
    );
  }
}