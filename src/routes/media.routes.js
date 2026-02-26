// src/routes/media.routes.js
import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import { getOne, destroy } from '../controllers/media.controller.js';
import upload from '../middleware/upload.middleware.js';
import { uploadForInstallation } from '../controllers/media.controller.js';

const router = Router();

router.get('/:id',    requireAuth, authorize('installations:read' , 'crew:*','manager:*'),  getOne);
router.delete('/:id', requireAuth, authorize('installations:write','crew:*','manager:*'), destroy);

// Upload file to installation
router.post(
  '/installations/:id/media/upload',
  requireAuth,
  authorize('installations:write','crew:*','manager:*'),
  upload.single('file'),
  uploadForInstallation
);

export default router;
