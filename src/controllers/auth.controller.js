import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET; // REQUIRED in prod
const ISS = process.env.JWT_ISS || 'installops';
const AUD = process.env.JWT_AUD || 'installops-api';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'bad_request', message: 'Email and password required' });
    }

    const user = await db.User.findOne({
      where: { email },
      include: [{ model: db.Role, as: 'role' }]
    });
    if (!user || !user.password_hash) {
      // Do not leak which field failed
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: user.id, role_id: user.role_id },
      JWT_SECRET,
      { algorithm: 'HS256', issuer: ISS, audience: AUD, expiresIn: EXPIRES_IN }
    );

    res.json({
      token_type: 'Bearer',
      expires_in: EXPIRES_IN,
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role?.name || null }
    });
  } catch (e) { next(e); }
}

export async function me(req, res) {
  const u = req.user;
  res.json({
    id: u.sub,
    role_id: u.role_id || null,
    role: u.role?.name || null,
    permissions: u.permissions || []
  });
}
