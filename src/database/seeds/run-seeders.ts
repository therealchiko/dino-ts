import { AppDataSource } from "../../config/database";
import { runSeeders } from "./index";

async function seed() {
  try {
    const dataSource = await AppDataSource.initialize();
    await runSeeders(dataSource);
    process.exit(0);
  } catch (error) {
    console.error("Error running seeds:", error);
    process.exit(1);
  }
}

seed();