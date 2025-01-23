import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, AfterLoad } from "typeorm";
import { differenceInHours } from 'date-fns';

@Entity('dinosaurs')
export class Dinosaur {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  name!: string;

  @Column({ nullable: true })
  species!: string;

  @Column({ nullable: true })
  gender!: string;

  @Column('int')
  dinosaur_id!: number;

  @Column('int', { nullable: true })
  digestion_period_in_hours!: number;

  @Column({ nullable: true })
  herbivore!: boolean;

  @Column('int')
  park_id!: number;

  @Column({ nullable: true })
  location!: string;

  @Column({ nullable: true, type: 'timestamp' })
  last_fed!: Date;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  isDigesting!: boolean;

  @AfterLoad()
  calculateDigestionStatus() {
    if (!this.last_fed || !this.digestion_period_in_hours) {
      this.isDigesting = false;
      return;
    }

    const hoursSinceLastFed = differenceInHours(new Date(), new Date(this.last_fed));
    this.isDigesting = hoursSinceLastFed < this.digestion_period_in_hours;
  }

  isSafe(): boolean {
    if (this.herbivore) {
      return true;
    }
    return this.isDigesting;
  }
}