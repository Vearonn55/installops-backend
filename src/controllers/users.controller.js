import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import db from '../models/index.js';

const bad = (res, message, code = 400) => res.status(code).json({ error: 'bad_request', message });
const toInt = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const normEmail = (e) => String(e || '').trim().toLowerCase();

// GET /users
export async function list(req, res, next) {
  try {
    const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 100);
    const offset = Math.max(toInt(req.query.offset, 0), 0);
    const q = (req.query.q || '').trim();
    const role_id = req.query.role_id || null;
    const status = req.query.status || null;

    const where = {};
    if (q) where[Op.or] = [
      { name:  { [Op.iLike]: `%${q}%` } },
      { email: { [Op.iLike]: `%${q}%` } },
    ];
    if (role_id) where.role_id = role_id;
    if (status) where.status = status;

    const rows = await db.User.findAll({
      where,
      attributes: ['id','name','email','role_id','status','created_at','updated_at'],
      include: [{ model: db.Role, as: 'role', attributes: ['id','name'] }],
      order: [['created_at','DESC']],
      limit, offset
    });

    res.json({ data: rows, limit, offset });
  } catch (e) { next(e); }
}

// GET /users/:id
export async function getById(req, res, next) {
  try {
    const u = await db.User.findByPk(req.params.id, {
      attributes: ['id','name','email','role_id','status','created_at','updated_at'],
      include: [{ model: db.Role, as: 'role', attributes: ['id','name','permissions'] }]
    });
    if (!u) return res.status(404).json({ error: 'not_found', message: 'User not found' });
    res.json(u);
  } catch (e) { next(e); }
}

// POST /users
export async function createUser(req, res, next) {
  try {
    const { name, email, password, role_id } = req.body || {};
    const e = normEmail(email);
    if (!name || !e || !password || !role_id) {
      return bad(res, 'name, email, password, role_id are required');
    }
    if (password.length < 8) return bad(res, 'password must be at least 8 characters');

    const exists = await db.User.findOne({ where: { email: e } });
    if (exists) return res.status(409).json({ error: 'conflict', message: 'email already in use' });

    const role = await db.Role.findByPk(role_id);
    if (!role) return bad(res, 'role_id not found', 404);

    const password_hash = await bcrypt.hash(password, 12);
    const user = await db.User.create({
      name, email: e, password_hash, role_id: role.id, status: 'active'
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role: role.name
    });
  } catch (e) { next(e); }
}

// PATCH /users/:id
export async function updateUser(req, res, next) {
  try {
    const { name, email, role_id, status } = req.body || {};
    const user = await db.User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'not_found', message: 'User not found' });

    if (email) {
      const e = normEmail(email);
      const dup = await db.User.findOne({ where: { email: e, id: { [Op.ne]: user.id } } });
      if (dup) return res.status(409).json({ error: 'conflict', message: 'email already in use' });
      user.email = e;
    }
    if (name) user.name = name;
    if (role_id) {
      const role = await db.Role.findByPk(role_id);
      if (!role) return bad(res, 'role_id not found', 404);
      user.role_id = role_id;
    }
    if (status) {
      const allowed = ['active','disabled'];
      if (!allowed.includes(status)) return bad(res, `status must be one of: ${allowed.join(', ')}`);
      user.status = status;
    }

    await user.save();
    const fresh = await db.User.findByPk(user.id, {
      attributes: ['id','name','email','role_id','status','created_at','updated_at'],
      include: [{ model: db.Role, as: 'role', attributes: ['id','name'] }]
    });
    res.json(fresh);
  } catch (e) { next(e); }
}

// PATCH /users/:id/password  (self or admin)
export async function updatePassword(req, res, next) {
  try {
    const targetId = req.params.id;
    const meId = req.session?.user?.id;

    // If updating someone else, require users:write
    const isSelf = meId && meId === targetId;
    if (!isSelf) {
      const perms = req.session?.user?.permissions || [];
      if (!(perms.includes('users:write') || perms.includes('admin:*'))) {
        return res.status(403).json({ error: 'forbidden', message: 'Insufficient permissions' });
      }
    }

    const { current_password, new_password } = req.body || {};
    if (!new_password || new_password.length < 8) {
      return bad(res, 'new_password must be at least 8 characters');
    }

    const user = await db.User.findByPk(targetId);
    if (!user) return res.status(404).json({ error: 'not_found', message: 'User not found' });

    // If self, verify current_password
    if (isSelf) {
      if (!current_password) return bad(res, 'current_password is required for self-change');
      const ok = user.password_hash ? await bcrypt.compare(current_password, user.password_hash) : false;
      if (!ok) return bad(res, 'current_password is incorrect', 401);
    }

    user.password_hash = await bcrypt.hash(new_password, 12);
    await user.save();

    res.json({ message: 'password_updated', user_id: user.id });
  } catch (e) { next(e); }
}
