import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Dinosaur } from '../models/Dinosaur';

export class DinosaurController {
  private dinoRepository = AppDataSource.getRepository(Dinosaur);

  async getAllDinosaurs(req: Request, res: Response) {
    try {
      const dinosaurs = await this.dinoRepository.find({
        where: { active: true }
      });
      res.json(dinosaurs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dinosaurs' });
    }
  }

  async getDinosaurById(req: Request, res: Response) {
    try {
      const dinosaur = await this.dinoRepository.findOne({
        where: { 
          dinosaur_id: parseInt(req.params.id),
          active: true
        }
      });

      if (!dinosaur) {
        return res.status(404).json({ error: 'Dinosaur not found' });
      }

      res.json(dinosaur);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dinosaur' });
    }
  }
}