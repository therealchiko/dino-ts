import { differenceInDays } from "date-fns/differenceInDays";
import { Entity, PrimaryGeneratedColumn, Column, AfterLoad } from "typeorm";
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

  isSafeForMaintenance(occupant: Dinosaur | null): boolean {
    return this.requiresMaintenance && (!occupant || occupant.isSafe());
  }

  getStatus(occupant: Dinosaur | null) {
    const hasOccupant = !!occupant;
    const hasSafeOccupant = !hasOccupant || (occupant && occupant.isSafe());

    return {
      code: this.code,
      requiresMaintenance: this.requiresMaintenance,
      daysSinceLastMaintenance: this.daysSinceLastMaintenance,
      safeForMaintenance: this.isSafeForMaintenance(occupant),
      hasOccupant,
      hasSafeOccupant,
    };
  }
}