// NEW: Checklists routes
import { Router } from 'express';
import * as ctl from '../controllers/checklists.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';

const auth = requireAuth;
const router = Router();

// Templates
router.get('/checklist-templates',            auth, authorize('checklists:read' ,'crew:*' ,'manager:*'),  ctl.listTemplates);
router.get('/checklist-templates/:id',        auth, authorize('checklists:read','crew:*' , 'manager:*'),  ctl.getTemplate);
router.post('/checklist-templates',           auth, authorize('checklists:write','crew:*' , 'manager:*'), ctl.createTemplate);
router.patch('/checklist-templates/:id',      auth, authorize('checklists:write','crew:*' , 'manager:*'), ctl.updateTemplate);

// Template Items
router.get('/checklist-templates/:id/items',  auth, authorize('checklists:read','crew:*','manager:*'),  ctl.listTemplateItems);
router.post('/checklist-templates/:id/items', auth, authorize('checklists:write','crew:*','manager:*'), ctl.createTemplateItem);
router.patch('/checklist-items/:itemId',      auth, authorize('checklists:write','crew:*','manager:*'), ctl.updateChecklistItem);

// Installation Responses
router.get('/installations/:id/checklist-responses',  auth, authorize('checklists:read','crew:*','manager:*'),  ctl.listInstallChecklistResponses);
router.post('/installations/:id/checklist-responses', auth, authorize('checklists:write','crew:*','manager:*'), ctl.upsertInstallChecklistResponse);
router.patch('/checklist-responses/:id',              auth, authorize('checklists:write','crew:*','manager:*'), ctl.updateChecklistResponse);

export default router;
