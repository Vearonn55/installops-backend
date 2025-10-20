import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Too many login attempts, please try later.' }
});

export default loginLimiter;
