// src/routes/audit_logs.routes.js
import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import * as ctl from '../controllers/audit_logs.controller.js';

const router = Router();

/**
 * Permission model:
 * - 'audit:read' may read audit logs
 * - 'admin:*' inherently passes authorize()
 */
router.get(
  '/',
  requireAuth,
  authorize('audit:read', 'admin:*'),
  ctl.list
);

router.get(
  '/:id',
  requireAuth,
  authorize('audit:read', 'admin:*'),
  ctl.getById
);

export default router;
