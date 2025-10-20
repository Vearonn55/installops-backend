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

//default route
router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ROUTE MOUNTS
router.use('/auth', auth);
console.log('/auth mounted');

router.use('/installations', installations);
console.log('/installations mounted');

router.use('/users', users);
console.log('/users mounted');

router.use('/roles', roles);
console.log('/roles mounted');

router.use('/stores', stores);
console.log('/stores mounted');

router.use('/addresses', addresses);
console.log('/addresses mounted');

router.use('/', checklists); // mounts all checklist routes at API root since they include full paths
console.log('/checklists mounted');

router.use('/media', media);            
console.log('/media mounted');

router.use('/audit-logs', auditLogs);
console.log('/audit-logs mounted');

export default router;
