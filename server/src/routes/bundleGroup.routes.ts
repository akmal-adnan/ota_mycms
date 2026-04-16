import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import {
  createGroup,
  listGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  uploadFiles,
} from '../controllers/bundleGroup.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 },
});

router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', listGroups);
router.get('/:id', getGroup);
router.patch('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.post(
  '/:id/upload',
  upload.fields([
    { name: 'androidBundle', maxCount: 1 },
    { name: 'iosBundle', maxCount: 1 },
  ]),
  uploadFiles,
);

export default router;
