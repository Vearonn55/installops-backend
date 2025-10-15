import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET; 
const ALGS = ['HS256', 'RS256'];

export default async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'unauthorized', message: 'Missing bearer token' });

    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ALGS });
    let role = null, permissions = [];
    if (payload.role_id) {
      role = await db.Role.findByPk(payload.role_id);
      permissions = Array.isArray(role?.permissions) ? role.permissions : [];
    }
    req.user = { ...payload, role, permissions };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized', message: e.message });
  }
}
