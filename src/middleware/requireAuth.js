export default function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    const hasCookie = !!req.headers.cookie;
    const hasSid = hasCookie && req.headers.cookie.includes('sid=');
    console.warn(
      '[auth] 401: session missing. cookie=%s sid=%s',
      hasCookie ? 'present' : 'MISSING',
      hasSid ? 'present' : 'missing'
    );
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
