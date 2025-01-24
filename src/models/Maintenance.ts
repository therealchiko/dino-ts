import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Zone } from "./Zone";

@Entity('maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  location!: string;

  @ManyToOne(() => Zone)
  @JoinColumn({ name: 'location', referencedColumnName: 'code' })
  zone!: Zone;

  @Column('int')
  park_id!: number;

  @CreateDateColumn()
  performed_at!: Date;
}