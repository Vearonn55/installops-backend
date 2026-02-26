import { Router } from 'express';
const router = Router();

// ROUTE IMPORTS
import auth from './auth.routes.js';
import installations from './installations.routes.js';
import users from './users.routes.js';
import roles from './roles.routes.js';
import stores from './stores.routes.js';
import addresses from './addresses.routes.js';
import checklists from './checklists.routes.js';
import media from './media.routes.js';
import auditLogs from './audit_logs.routes.js';
import orders from './orders.routes.js';

//default route
router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ROUTE MOUNTS
router.use('/auth', auth);
router.use('/installations', installations);
router.use('/users', users);
router.use('/roles', roles);
router.use('/stores', stores);
router.use('/addresses', addresses);
router.use('/', checklists);
router.use('/media', media);
router.use('/audit-logs', auditLogs);
router.use('/orders', orders);

export default router;
