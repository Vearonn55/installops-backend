import { Op } from 'sequelize';
import db from '../models/index.js';

const bad = (res, message, code = 400) => res.status(code).json({ error: 'bad_request', message });
const toInt = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// GET /roles
export async function list(req, res, next) {
  try {
    const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 100);
    const offset = Math.max(toInt(req.query.offset, 0), 0);
    const q = (req.query.q || '').trim();

    const where = {};
    if (q) where.name = { [Op.iLike]: `%${q}%` };

    const rows = await db.Role.findAll({
      where,
      attributes: ['id','name','permissions','created_at','updated_at'],
      order: [['name','ASC']],
      limit, offset
    });

    res.json({ data: rows, limit, offset });
  } catch (e) { next(e); }
}

// GET /roles/:id
export async function getById(req, res, next) {
  try {
    const r = await db.Role.findByPk(req.params.id, {
      attributes: ['id','name','permissions','created_at','updated_at']
    });
    if (!r) return res.status(404).json({ error: 'not_found', message: 'Role not found' });
    res.json(r);
  } catch (e) { next(e); }
}

// POST /roles
export async function create(req, res, next) {
  try {
    const { name, permissions } = req.body || {};
    if (!name) return bad(res, 'name is required');
    const exists = await db.Role.findOne({ where: { name } });
    if (exists) return res.status(409).json({ error: 'conflict', message: 'role name already exists' });

    const perms = Array.isArray(permissions) ? permissions : [];
    const role = await db.Role.create({ name, permissions: perms });

    res.status(201).json({
      id: role.id, name: role.name, permissions: role.permissions
    });
  } catch (e) { next(e); }
}

// PATCH /roles/:id
export async function update(req, res, next) {
  try {
    const { name, permissions } = req.body || {};
    const role = await db.Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ error: 'not_found', message: 'Role not found' });

    if (name && name !== role.name) {
      const dup = await db.Role.findOne({ where: { name, id: { [Op.ne]: role.id } } });
      if (dup) return res.status(409).json({ error: 'conflict', message: 'role name already exists' });
      role.name = name;
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) return bad(res, 'permissions must be an array');
      role.permissions = permissions;
    }

    await role.save();
    res.json({ id: role.id, name: role.name, permissions: role.permissions });
  } catch (e) { next(e); }
}
