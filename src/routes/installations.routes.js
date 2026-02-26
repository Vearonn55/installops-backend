// src/routes/installations.routes.js
import { Router } from 'express';
import * as ctl from '../controllers/installations.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import { listForInstallation, createForInstallation } from '../controllers/media.controller.js';

const router = Router();

// READ operations
router.get('/',requireAuth,authorize('installations:read', 'crew:*', 'manager:*'),ctl.list);
router.get('/:id',requireAuth,authorize('installations:read', 'crew:*', 'manager:*'),ctl.getById);

// WRITE operations
router.post('/',requireAuth,authorize('installations:write', 'manager:*'),ctl.create);
router.post('/:id/items',requireAuth,authorize('installations:write', 'manager:*'),ctl.addItem);
router.post('/:id/crew',requireAuth,authorize('installations:write', 'crew:*', 'manager:*'),ctl.assignCrew);
router.patch('/:id/status',requireAuth,authorize('installations:write', 'crew:*', 'manager:*'),ctl.updateStatus);

// PATCH installation
router.patch('/:id',requireAuth,authorize('installations:write', 'manager:*'),ctl.update);

// installation items
router.get( '/:id/items', requireAuth,authorize('installations:read', 'crew:*', 'manager:*'),ctl.listItems);
router.patch( '/:id/items/:itemId', requireAuth,authorize('installations:write', 'manager:*'),ctl.updateItem);
router.delete( '/:id/items/:itemId', requireAuth, authorize('installations:write', 'manager:*'), ctl.removeItem);

// crew assign
router.get( '/:id/crew', requireAuth, authorize('installations:read', 'crew:*', 'manager:*'), ctl.listCrew);
router.patch( '/:id/crew/:asgnId', requireAuth, authorize('installations:write', 'manager:*'), ctl.updateAssignment);
router.delete( '/:id/crew/:asgnId', requireAuth, authorize('installations:write', 'manager:*'), ctl.removeAssignment);

// media
router.get( '/:id/media', requireAuth, authorize('installations:read', 'crew:*', 'manager:*'), listForInstallation);
router.post( '/:id/media', requireAuth, authorize('installations:write', 'crew:*', 'manager:*'), createForInstallation);

// crew after installation notes
router.patch('/:id/crew-after-notes', requireAuth, authorize('installations:write', 'crew:*', 'manager:*'), ctl.upsertCrewAfterNotes);
router.delete( '/:id/crew-after-notes', requireAuth,authorize('installations:write', 'crew:*', 'manager:*'),ctl.deleteCrewAfterNotes);

export default router;
