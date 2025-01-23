import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class InitialMigration1709123456789 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create zones table
        await queryRunner.createTable(new Table({
            name: "zones",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "code",
                    type: "varchar",
                    isUnique: true
                },
                {
                    name: "park_id",
                    type: "integer"
                },
                {
                    name: "last_maintenance",
                    type: "timestamp",
                    isNullable: true
                }
            ]
        }), true);

        // Create dinosaurs table
        await queryRunner.createTable(new Table({
            name: "dinosaurs",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "species",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "gender",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "dinosaur_id",
                    type: "integer"
                },
                {
                    name: "digestion_period_in_hours",
                    type: "integer",
                    isNullable: true
                },
                {
                    name: "herbivore",
                    type: "boolean",
                    isNullable: true
                },
                {
                    name: "park_id",
                    type: "integer"
                },
                {
                    name: "location",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "last_fed",
                    type: "timestamp",
                    isNullable: true
                },
                {
                    name: "active",
                    type: "boolean",
                    default: true
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        // Create maintenance table
        await queryRunner.createTable(new Table({
            name: "maintenance",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "location",
                    type: "varchar"
                },
                {
                    name: "park_id",
                    type: "integer"
                },
                {
                    name: "performed_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("maintenance");
        await queryRunner.dropTable("dinosaurs");
        await queryRunner.dropTable("zones");
    }
}