// src/routes/media.routes.js
import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import { getOne, destroy } from '../controllers/media.controller.js';

const router = Router();

router.get('/:id',    requireAuth, authorize('installations:read' , 'crew:*'),  getOne);
router.delete('/:id', requireAuth, authorize('installations:write','crew:*'), destroy);

export default router;
