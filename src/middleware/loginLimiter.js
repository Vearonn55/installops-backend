import rateLimit from 'express-rate-limit';

export default rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 50,                  // 50 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Too many login attempts, please try later.' }
});
