import { Router } from 'express';
import {
  getUpdateJson,
  getLatestUpdate,
  listBundles,
} from '../controllers/updates.controller';
import { updatesAccessMiddleware } from '../middleware/updatesAccess';

const router = Router();

router.use(updatesAccessMiddleware);

router.get('/list', listBundles);
router.get('/latest', getLatestUpdate);
router.get('/:id', getUpdateJson);

export default router;
