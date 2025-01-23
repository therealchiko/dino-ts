import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Zone } from '../models/Zone';
import { Dinosaur } from '../models/Dinosaur';
import { CacheService } from '../services/CacheService';

export class ParkController {
  static readonly CACHE_KEY = 'park_status';
  
  private zoneRepository = AppDataSource.getRepository(Zone);
  private dinoRepository = AppDataSource.getRepository(Dinosaur);

  async status(req: Request, res: Response) {
    try {
      const cachedStatus = CacheService.get(ParkController.CACHE_KEY);

      // quickly return cached status if available
      if (cachedStatus) {
        return res.status(200).json(cachedStatus);
      }

      const zones = await this.zoneRepository.find();
      const activeDinosaurs = await this.dinoRepository.find({ 
        where: { active: true }
      });

      const zoneStatuses = zones.map(zone => {
        const occupant = activeDinosaurs.find(dino => dino.location === zone.code) || null;
        
        return {
          ...zone.getStatus(occupant),
          occupant: occupant ? {
            name: occupant.name,
            species: occupant.species,
            id: occupant.dinosaur_id,
            herbivore: occupant.herbivore,
            lastFed: occupant.last_fed,
            isDigesting: occupant.isDigesting,
            digestionPeriodInHours: occupant.digestion_period_in_hours
          } : null
        };
      });

      const parkStatus = {
        totalZones: zones.length,
        occupiedZones: zoneStatuses.filter(z => z.hasOccupant).length,
        zonesNeedingMaintenance: zoneStatuses.filter(z => z.requiresMaintenance).length,
        safeZones: zoneStatuses.filter(z => z.hasSafeOccupant).length,
        zones: zoneStatuses
      };

      CacheService.set(ParkController.CACHE_KEY, parkStatus);
      res.status(200).json(parkStatus);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch park status' });
    }
  }
}