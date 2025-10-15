import { Router } from 'express';
import * as ctl from '../controllers/installations.controller.js';
import auth from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';

const router = Router();

// Reads: choose open or protected; here: protected
router.get('/', auth, authorize('installations:read'), ctl.list);
router.get('/:id', auth, authorize('installations:read'), ctl.getById);

// Writes: protected
router.post('/', auth, authorize('installations:write'), ctl.create);
router.post('/:id/items', auth, authorize('installations:write'), ctl.addItem);
router.post('/:id/crew', auth, authorize('installations:write'), ctl.assignCrew);
router.patch('/:id/status', auth, authorize('installations:write'), ctl.updateStatus);

export default router;
