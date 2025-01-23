import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Zone } from '../models/Zone';
import { Maintenance } from '../models/Maintenance';

export class ZoneController {
  private zoneRepository = AppDataSource.getRepository(Zone);
  private maintenanceRepository = AppDataSource.getRepository(Maintenance);

  async getAllZones(req: Request, res: Response) {
    try {
      const zones = await this.zoneRepository.find();
      const result = zones.map((zone) => ({
        ...zone,
        maintenance_history: this.maintenanceRepository.find({
          where: { location: zone.code },
          order: { performed_at: 'DESC' },
          take: 5
        })
      }))
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch zones' });
    }
  }

  async getZoneByCode(req: Request, res: Response) {
    try {
      const zone = await this.zoneRepository.findOne({
        where: { code: req.params.code }
      });

      if (!zone) {
        return res.status(404).json({ error: 'Zone not found' });
      }

      const maintenance = await this.maintenanceRepository.find({
        where: { location: req.params.code },
        order: { performed_at: 'DESC' },
        take: 5
      });

      res.json({
        ...zone,
        maintenance_history: maintenance
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch zone' });
    }
  }
}