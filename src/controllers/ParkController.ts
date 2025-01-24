import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Zone } from '../models/Zone';
import { Dinosaur } from '../models/Dinosaur';
import { CacheService } from '../services/CacheService';

export class ParkController {
  static readonly CACHE_KEY = 'park_status';
  
  private zoneRepo = AppDataSource.getRepository(Zone);
  private dinoRepo = AppDataSource.getRepository(Dinosaur);

  async status(req: Request, res: Response) {
    try {
      const cached = await CacheService.get(ParkController.CACHE_KEY);
      if (cached) {
        return res.json(cached);
      }

      const [dinos, zones] = await Promise.all([
        this.dinoRepo.find({
          where: { active: true }
        }),
        this.zoneRepo.find()
      ]);

      const zoneStatuses = zones.map(zone => {
        const occupant = dinos.find(d => d.location_code === zone.code);
        const status = zone.getStatus();

        if (occupant) {
          status.occupancy.details = {
            name: occupant.name,
            species: occupant.species,
            herbivore: occupant.herbivore,
            isDigesting: occupant.isDigesting,
            digestionPeriodInHours: occupant.digestion_period_in_hours
          };
        }

        return status;
      });

      const response = {
        zones: zoneStatuses,
        stats: {
          occupiedZones: zoneStatuses.filter(z => z.occupancy.hasOccupant).length,
          zonesNeedingMaintenance: zoneStatuses.filter(z => z.maintenance.required).length,
          safeZones: zoneStatuses.filter(z => z.occupancy.isSafe).length,
        },
        dinosaurs: dinos.map(dino => ({
          id: dino.dinosaur_id,
          name: dino.name,
          species: dino.species,
          location: dino.location
        }))
      };

      await CacheService.set(ParkController.CACHE_KEY, response);
      res.json(response);
    } catch (error) {
      console.error('Error getting park status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}