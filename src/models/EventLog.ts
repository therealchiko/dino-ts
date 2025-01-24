import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('event_log')
@Unique('unique_event_constraint', ['kind', 'dinosaur_id', 'park_id', 'time'])
export class EventLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  kind!: string;

  @Column({ nullable: true })
  dinosaur_id!: number;

  @Column()
  park_id!: number;

  @Column({ type: 'timestamp' })
  time!: Date;

  @Column({ nullable: true })
  location!: string;

  @Column({ nullable: true })
  name!: string;

  @Column({ nullable: true })
  species!: string;

  @Column({ nullable: true })
  gender!: string;

  @Column({ nullable: true })
  digestion_period_in_hours!: number;

  @Column({ nullable: true })
  herbivore!: boolean;

  @Column({ type: 'jsonb' })
  raw_event!: object;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;
}