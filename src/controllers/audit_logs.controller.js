// src/controllers/audit_logs.controller.js
import db from '../models/index.js';
const { Op } = db.Sequelize;

function intSafe(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : d;
}

export async function list(req, res, next) {
  try {
    const {
      actor_id,
      entity,
      entity_id,
      action,
      date_from,
      date_to,
      q,
      limit = 20,
      offset = 0,
    } = req.query;

    const where = {};

    if (actor_id) where.actor_id = actor_id;
    if (entity) where.entity = entity;
    if (entity_id) where.entity_id = entity_id;
    if (action) where.action = action;

    // date range
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to);
    }

    // keyword search across relevant text columns
    if (q) {
      where[Op.or] = [
        { action: { [Op.iLike]: `%${q}%` } },
        { entity: { [Op.iLike]: `%${q}%` } },
        { ip: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const rows = await db.AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: intSafe(limit, 20),
      offset: intSafe(offset, 0),
    });

    const total = await db.AuditLog.count({ where });
    res.json({ data: rows, total, limit: intSafe(limit, 20), offset: intSafe(offset, 0) });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const row = await db.AuditLog.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Audit log not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}
