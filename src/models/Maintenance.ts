import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  location!: string;

  @Column('int')
  park_id!: number;

  @CreateDateColumn()
  performed_at!: Date;
}