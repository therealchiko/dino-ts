import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Dinosaur } from '../models/Dinosaur';
import { Maintenance } from '../models/Maintenance';
import { Zone } from '../models/Zone';
import { DinoAddedEvent, DinoFedEvent, DinoLocationEvent, DinoRemovedEvent, FeedEvent, MaintenanceEvent } from '../types/events';

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

  async processEvent(event: FeedEvent): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    // if things go awry, let's be able to rollback the entire transaction
    await queryRunner.startTransaction();

    try {
      switch (event.kind) {
        case 'dino_added':
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handleDinoAdded(event: DinoAddedEvent, queryRunner: QueryRunner): Promise<void> {
    const existingDino = await queryRunner.manager.findOne(Dinosaur, {
      where: { dinosaur_id: event.id }
    });

    if (existingDino) {
      return;
    }

    const dino = queryRunner.manager.create(Dinosaur, {
      name: event.name,
      species: event.species,
      gender: event.gender,
      dinosaur_id: event.id,
      digestion_period_in_hours: event.digestion_period_in_hours,
      herbivore: event.herbivore,
      park_id: event.park_id,
      active: true
    });
    await queryRunner.manager.save(Dinosaur, dino);
  }

  private async handleDinoFed(event: DinoFedEvent, queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.manager.update(Dinosaur, 
      { dinosaur_id: event.dinosaur_id, active: true },
      { last_fed: new Date(event.time) }
    );

    if (result.affected === 0) {
      throw new Error(`Dinosaur ${event.dinosaur_id} not found or not active`);
    }
  }

  private async handleDinoLocation(event: DinoLocationEvent, queryRunner: QueryRunner): Promise<void> {
    const zone = await queryRunner.manager.findOne(Zone, {
      where: { code: event.location }
    });

    if (!zone) {
      throw new Error(`Invalid zone location: ${event.location}`);
    }

    const result = await queryRunner.manager.update(Dinosaur,
      { dinosaur_id: event.dinosaur_id, active: true },
      { location: event.location }
    );

    if (result.affected === 0) {
      throw new Error(`Dinosaur ${event.dinosaur_id} not found or not active`);
    }
  }

  private async handleDinoRemoved(event: DinoRemovedEvent, queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.manager.update(Dinosaur,
      { dinosaur_id: event.dinosaur_id, active: true },
      { active: false }
    );

    if (result.affected === 0) {
      throw new Error(`Dinosaur ${event.dinosaur_id} not found or already inactive`);
    }
  }

  private async handleMaintenance(event: MaintenanceEvent, queryRunner: QueryRunner): Promise<void> {
    const zone = await queryRunner.manager.findOne(Zone, {
      where: { code: event.location }
    });

    if (!zone) {
      throw new Error(`Invalid zone location: ${event.location}`);
    }

    const maintenance = queryRunner.manager.create(Maintenance, {
      location: event.location,
      park_id: event.park_id,
      performed_at: new Date(event.time)
    });
    await queryRunner.manager.save(Maintenance, maintenance);

    await queryRunner.manager.update(Zone,
      { code: event.location },
      { last_maintenance: new Date(event.time) }
    );
  }
}