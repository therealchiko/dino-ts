import { Router, Request, Response } from 'express';
import { DinosaurController } from '../controllers/DinosaurController';

const router = Router();
const dinosaurController = new DinosaurController();

router.get('/dinosaurs', async (req: Request, res: Response) => {
    await dinosaurController.getAllDinosaurs(req, res);
});

router.get('/dinosaurs/:id', async (req: Request, res: Response) => {
    await dinosaurController.getDinosaurById(req, res);
});

export default router;