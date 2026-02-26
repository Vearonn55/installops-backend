import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import * as ctl from '../controllers/stores.controller.js';

const router = Router();

// Reads
router.get('/',    requireAuth, authorize('stores:read','crew:*','manager:*'),  ctl.list);
router.get('/:id', requireAuth, authorize('stores:read','crew:*','manager:*'),  ctl.getById);

// Writes
router.post('/',        requireAuth, authorize('stores:write','manager:*'), ctl.create);
router.patch('/:id',    requireAuth, authorize('stores:write','manager:*'), ctl.update);

export default router;
