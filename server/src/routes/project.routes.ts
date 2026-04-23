import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import {
  listProjects,
  createProject,
  deleteProject,
  listProjectBundles,
  createProjectBundle,
  updateProjectBundle,
  deleteProjectBundle,
  uploadProjectBundleFiles,
  releaseProjectBundle,
  listProjectReleases,
} from '../controllers/project.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 },
});

router.use(authMiddleware);

// Project CRUD
router.get('/', listProjects);
router.post('/', createProject);
router.delete('/:projectId', deleteProject);

// Bundle management under a project
router.get('/:projectId/bundles', listProjectBundles);
router.post('/:projectId/bundles', createProjectBundle);
router.patch('/:projectId/bundles/:bundleId', updateProjectBundle);
router.delete('/:projectId/bundles/:bundleId', deleteProjectBundle);
router.post(
  '/:projectId/bundles/:bundleId/upload',
  upload.fields([
    { name: 'androidBundle', maxCount: 1 },
    { name: 'iosBundle', maxCount: 1 },
  ]),
  uploadProjectBundleFiles,
);

// Release actions
router.post('/:projectId/bundles/:bundleId/release', releaseProjectBundle);
router.get('/:projectId/releases', listProjectReleases);

export default router;
