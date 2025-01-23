import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

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
}