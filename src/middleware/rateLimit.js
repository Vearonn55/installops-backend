// src/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';
export const apiLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });

