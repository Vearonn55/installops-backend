import { Router } from 'express';
import * as ctl from '../controllers/auth.controller.js';
import auth from '../middleware/auth.js';
import loginLimiter from '../middleware/loginLimiter.js';

const router = Router();

// PRODUCTION login (email + password)
router.post('/login', loginLimiter, ctl.login);

// Authenticated profile
router.get('/me', auth, ctl.me);

export default router;
