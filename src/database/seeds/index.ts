import { DataSource } from "typeorm";
import { ZoneSeeder } from "./ZoneSeeder";

export async function runSeeders(dataSource: DataSource): Promise<void> {
  console.log("starting seeding of zones...");
  try {
    await ZoneSeeder.run(dataSource);
    console.log("zones seeded");
  } catch (error) {
    console.log("error seeding zones", error);
  }
}