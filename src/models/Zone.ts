import { differenceInDays } from "date-fns/differenceInDays";
import { Entity, PrimaryGeneratedColumn, Column, AfterLoad, OneToOne, JoinColumn, AfterInsert } from "typeorm";
import { Dinosaur } from "./Dinosaur";

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column('int')
  park_id!: number;

  @Column({ type: 'timestamp', nullable: true })
  last_maintenance!: Date;

  // Computed properties
  requiresMaintenance!: boolean;
  daysSinceLastMaintenance!: number;

  @AfterLoad()
  @AfterInsert()
  calculateMaintenanceStatus() {
    if (!this.last_maintenance) {
      // requiring maintenance is a case of there not being an unsafe dinosaur, otherwise
      // lets have it false by default
      this.requiresMaintenance = false;
      this.daysSinceLastMaintenance = Infinity;
      return;
    }

    const now = new Date();
    const maintenanceDate = new Date(this.last_maintenance);
    this.daysSinceLastMaintenance = differenceInDays(now, maintenanceDate);
    this.requiresMaintenance = this.daysSinceLastMaintenance > 30;
  }

  @OneToOne(() => Dinosaur, dinosaur => dinosaur.location, { eager: true })
  occupant?: Dinosaur;

  getStatus() {
    if (this.daysSinceLastMaintenance === undefined) {
      this.calculateMaintenanceStatus();
    }

    const hasOccupant = !!this.occupant;
    const hasSafeOccupant = !hasOccupant || (this.occupant && this.occupant.isSafe());

    return {
      code: this.code,
      maintenance: {
        required: this.requiresMaintenance,
        daysSinceLastMaintenance: this.daysSinceLastMaintenance,
        safeForMaintenance: this.isSafeForMaintenance(),
      },
      occupancy: {
        hasOccupant,
        isSafe: hasOccupant ? hasSafeOccupant : true,
        details: hasOccupant ? {
          name: this.occupant!.name,
          species: this.occupant!.species,
          herbivore: this.occupant!.herbivore,
          isDigesting: this.occupant!.isDigesting,
          digestionPeriodInHours: this.occupant!.digestion_period_in_hours
        } : null,
      }
    }
  }

  isSafeForMaintenance(): boolean {
    return (!this.occupant || this.occupant.isSafe());
  }
}