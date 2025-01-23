import { DataSource } from "typeorm";
import { Zone } from "../../models/Zone";

export class ZoneSeeder {
  static async run(dataSource: DataSource): Promise<void> {
    const zoneRepo = dataSource.getRepository(Zone);
    
    // Vritual grid
    const zones: Partial<Zone>[] = [];
    
    for (let letter = 65; letter <= 90; letter++) { // A-Z
      for (let number = 0; number <= 15; number++) { // 0-15
        zones.push({
          code: `${String.fromCharCode(letter)}${number}`,
          park_id: 1,
        });
      }
    }
    
    await zoneRepo.save(zones);
  }
}