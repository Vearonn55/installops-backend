import { Router } from 'express';
import * as ctl from '../controllers/users.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';

const router = Router();

// Users
router.get('/', requireAuth, authorize('users:read'), ctl.list);
router.get('/:id', requireAuth, authorize('users:read'), ctl.getById);
router.post('/', requireAuth, authorize('users:write'), ctl.createUser);
router.patch('/:id', requireAuth, authorize('users:write'), ctl.updateUser);

// Password update:
// - Self (id === session user): allowed without users:write
// - Admin changing someone else: requires users:write
router.patch('/:id/password', requireAuth, ctl.updatePassword);

export default router;
