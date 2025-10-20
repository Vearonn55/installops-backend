import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import * as ctl from '../controllers/addresses.controller.js';

const router = Router();

// Reads
router.get('/',    requireAuth, authorize('addresses:read'),  ctl.list);
router.get('/:id', requireAuth, authorize('addresses:read'),  ctl.getById);

// Writes
router.post('/',     requireAuth, authorize('addresses:write'), ctl.create);
router.patch('/:id', requireAuth, authorize('addresses:write'), ctl.update);

export default router;
