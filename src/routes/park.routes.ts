import { Router, Request, Response } from 'express';
import { ParkController } from '../controllers/ParkController';

const router = Router();
const parkController = new ParkController();

router.get('/park/status', async (req: Request, res: Response) => {
    await parkController.status(req, res);
});

export default router;