import session from 'express-session';

export function makeSessionMiddleware() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    throw new Error('SESSION_SECRET env var is required and should be a long random string');
  }

  const twelveHoursMs = 12 * 60 * 60 * 1000;

  return session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,   // <-- REQUIRED
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true', // true in prod HTTPS
      sameSite: process.env.COOKIE_SAMESITE || 'lax',
      maxAge: twelveHoursMs
    }
  });
}
