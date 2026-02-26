// src/routes/orders.routes.js
// Order = external_order_id. Endpoints: list installations for order, order timeline (chronological events).

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import authorize from '../middleware/authorize.js';
import * as ctl from '../controllers/orders.controller.js';

const router = Router();

router.get(
  '/:external_order_id/installations',
  requireAuth,
  authorize('installations:read', 'crew:*', 'manager:*'),
  ctl.listInstallations
);

router.get(
  '/:external_order_id/timeline',
  requireAuth,
  authorize('installations:read', 'crew:*', 'manager:*'),
  ctl.getTimeline
);

export default router;
