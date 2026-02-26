import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import * as ctl from '../controllers/addresses.controller.js';

const router = Router();

// Reads (manager and crew can read addresses e.g. for stores/customers)
router.get('/',    requireAuth, authorize('addresses:read', 'crew:*', 'manager:*'),  ctl.list);
router.get('/:id', requireAuth, authorize('addresses:read', 'crew:*', 'manager:*'),  ctl.getById);

// Writes
router.post('/',     requireAuth, authorize('addresses:write', 'manager:*'), ctl.create);
router.patch('/:id', requireAuth, authorize('addresses:write', 'manager:*'), ctl.update);

export default router;
