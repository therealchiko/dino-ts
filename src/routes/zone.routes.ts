import { Router } from 'express';
import { ZoneController } from '../controllers/ZoneController';
import { Request, Response } from 'express';

const router = Router();
const zoneController = new ZoneController();

router.get('/zones', zoneController.getAllZones.bind(zoneController));
router.get('/zones/:code', async (req: Request, res: Response) => {
  await zoneController.getZoneByCode(req, res);
})

export default router;