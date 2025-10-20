import { Router } from 'express';
import * as ctl from '../controllers/auth.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import loginLimiter from '../middleware/loginLimiter.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Too many registration attempts' }
});

router.post('/register', registerLimiter, ctl.register);
router.post('/login', loginLimiter, ctl.login);
router.get('/me', requireAuth, ctl.me);
router.post('/logout', requireAuth, ctl.logout);

console.log('[routes/auth] registered: POST /register, POST /login, GET /me, POST /logout');
export default router;
