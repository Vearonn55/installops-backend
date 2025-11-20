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

      // In production we serve via HTTPS behind nginx,
      // so secure cookies are correct there. In local dev
      // (when you run the backend on localhost) this will be false.
      secure: isProd,

      // REQUIRED for your friend’s frontend:
      // localhost:3000 -> kurulum.alplerltd.com is cross-site,
      // so SameSite must be "none" or the cookie is blocked.
      sameSite: 'none',

      maxAge: twelveHoursMs,
    },
  });
}
