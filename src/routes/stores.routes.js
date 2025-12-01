import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import * as ctl from '../controllers/stores.controller.js';

const router = Router();

// Reads
router.get('/',    requireAuth, authorize('stores:read','crew:*'),  ctl.list);
router.get('/:id', requireAuth, authorize('stores:read','crew:*'),  ctl.getById);

// Writes
router.post('/',        requireAuth, authorize('stores:write'), ctl.create);
router.patch('/:id',    requireAuth, authorize('stores:write'), ctl.update);

export default router;
