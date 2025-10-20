// src/routes/installations.routes.js
import { Router } from 'express';
import * as ctl from '../controllers/installations.controller.js';
import requireAuth from '../middleware/requireAuth.js';   // session guard
import authorize from '../middleware/authorize.js';        // permission checker
import { listForInstallation, createForInstallation } from '../controllers/media.controller.js';

const router = Router();

// READ operations — require session + read permission
router.get('/', requireAuth, authorize('installations:read'), ctl.list);
router.get('/:id', requireAuth, authorize('installations:read'), ctl.getById);

// WRITE operations — require session + write permission
router.post('/', requireAuth, authorize('installations:write'), ctl.create);
router.post('/:id/items', requireAuth, authorize('installations:write'), ctl.addItem);
router.post('/:id/crew', requireAuth, authorize('installations:write'), ctl.assignCrew);
router.patch('/:id/status', requireAuth, authorize('installations:write'), ctl.updateStatus);

// PATCH 
router.patch('/:id',   requireAuth, authorize('installations:write'), ctl.update);

//installations items
router.get('/:id/items',    requireAuth, authorize('installations:read'),  ctl.listItems);
router.patch('/:id/items/:itemId', requireAuth, authorize('installations:write'), ctl.updateItem);
router.delete('/:id/items/:itemId', requireAuth, authorize('installations:write'), ctl.removeItem);

//crew assign
router.get('/:id/crew',     requireAuth, authorize('installations:read'),  ctl.listCrew);
router.patch('/:id/crew/:asgnId', requireAuth, authorize('installations:write'), ctl.updateAssignment);
router.delete('/:id/crew/:asgnId', requireAuth, authorize('installations:write'), ctl.removeAssignment);

// media
router.get('/:id/media',  requireAuth, authorize('installations:read'),  listForInstallation);
router.post('/:id/media', requireAuth, authorize('installations:write'), createForInstallation);



export default router;
