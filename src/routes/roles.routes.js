import { Router } from 'express';
import * as ctl from '../controllers/roles.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';

const router = Router();

// Roles
router.get('/', requireAuth, authorize('roles:read','crew:*'), ctl.list);
router.get('/:id', requireAuth, authorize('roles:read','crew:*'), ctl.getById);
router.post('/', requireAuth, authorize('roles:write'), ctl.create);
router.patch('/:id', requireAuth, authorize('roles:write'), ctl.update);

export default router;
