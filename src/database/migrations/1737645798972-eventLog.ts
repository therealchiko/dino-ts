import { MigrationInterface, QueryRunner, Table, TableUnique } from "typeorm";

export class CreateEventLogsTable1737645798972 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "event_log",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "kind",
                    type: "varchar",
                    length: "50"
                },
                {
                    name: "dinosaur_id",
                    type: "integer",
                    isNullable: true
                },
                {
                    name: "park_id",
                    type: "integer",
                    isNullable: true
                },
                {
                    name: "location",
                    type: "varchar",
                    length: "100",
                    isNullable: true
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "100",
                    isNullable: true
                },
                {
                    name: "species",
                    type: "varchar",
                    length: "100",
                    isNullable: true
                },
                {
                    name: "gender",
                    type: "varchar",
                    length: "10",
                    isNullable: true
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
                    name: "time",
                    type: "timestamp",
                    isNullable: false
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: 'raw_event',
                    type: 'jsonb',
                    isNullable: true
                }
            ]
        }), true);

        // we need this extra sauce to be able to identify duplicates and non-dups
        await queryRunner.createUniqueConstraint(
        'event_log',
            new TableUnique({
                name: 'unique_event_constraint',
                columnNames: ['kind', 'dinosaur_id', 'park_id', 'time'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropUniqueConstraint('event_log', 'unique_event_constraint');
        await queryRunner.dropTable("event_log");
    }
}