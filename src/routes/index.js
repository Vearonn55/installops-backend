import { Router } from 'express';
const router = Router();

// ROUTE IMPORTS
import auth from './auth.routes.js';
import installations from './installations.routes.js';


//default route
router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ROUTE MOUNTS
router.use('/auth', auth);
router.use('/installations', installations);



export default router;
