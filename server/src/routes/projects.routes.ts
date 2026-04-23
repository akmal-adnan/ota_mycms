import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import {
  addProjectApiKey,
  createProject,
  deleteProject,
  getProject,
  listProjectApiKeys,
  listProjects,
  removeProjectApiKey,
  updateProject,
} from '../controllers/project.controller';
import {
  createBundle,
  deleteBundle,
  getBundle,
  listBundles,
  releaseBundle,
  updateBundle,
  uploadBundleFiles,
} from '../controllers/bundle.controller';
import {
  getReleaseGroup,
  listReleaseGroups,
  toggleReleaseBundle,
} from '../controllers/release.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 },
});

router.use(authMiddleware);

router.get('/', listProjects);
router.post('/', createProject);
router.get('/:projectId', getProject);
router.patch('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);

router.get('/:projectId/api-keys', listProjectApiKeys);
router.post('/:projectId/api-keys', addProjectApiKey);
router.delete('/:projectId/api-keys/:keyId', removeProjectApiKey);

router.get('/:projectId/bundles', listBundles);
router.post('/:projectId/bundles', createBundle);
router.get('/:projectId/bundles/:bundleId', getBundle);
router.patch('/:projectId/bundles/:bundleId', updateBundle);
router.delete('/:projectId/bundles/:bundleId', deleteBundle);
router.post(
  '/:projectId/bundles/:bundleId/upload',
  upload.fields([
    { name: 'androidBundle', maxCount: 1 },
    { name: 'iosBundle', maxCount: 1 },
  ]),
  uploadBundleFiles,
);
router.post('/:projectId/bundles/:bundleId/release', releaseBundle);

router.get('/:projectId/releases', listReleaseGroups);
router.patch('/:projectId/releases/:bundleId/toggle', toggleReleaseBundle);
router.get('/:projectId/releases/:targetAppVersion', getReleaseGroup);

export default router;
