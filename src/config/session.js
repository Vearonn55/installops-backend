// src/config/session.js
import session from 'express-session';

export function makeSessionMiddleware() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    throw new Error('SESSION_SECRET env var is required and should be a long random string');
  }

  const twelveHoursMs = 12 * 60 * 60 * 1000;
  const isProd = process.env.NODE_ENV === 'production';

  return session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      // In prod we are behind nginx with HTTPS
      secure: isProd,
      // MUST be 'none' for localhost:3000 -> kurulum.alplerltd.com
      sameSite: 'none',
      maxAge: twelveHoursMs,
    },
  });
}
