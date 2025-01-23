import { DataSource } from "typeorm";
import { ZoneSeeder } from "./ZoneSeeder";

// this will seed all the tables

export async function runSeeders(dataSource: DataSource): Promise<void> {
  await ZoneSeeder.run(dataSource);
}