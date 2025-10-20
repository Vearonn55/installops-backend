import db from '../models/index.js';

const { Op } = db.Sequelize;
const toInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export async function list(req, res, next) {
  try {
    const limit  = toInt(req.query.limit, 20);
    const offset = toInt(req.query.offset, 0);
    const q      = (req.query.q || '').trim();
    const extId  = (req.query.external_id || '').trim();

    const where = {};
    if (q) where.name = { [Op.iLike]: `%${q}%` };
    if (extId) where.external_store_id = extId;

    const rows = await db.Store.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [{ model: db.Address, as: 'address' }],
    });

    res.json({ data: rows, limit, offset });
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const row = await db.Store.findByPk(req.params.id, {
      include: [{ model: db.Address, as: 'address' }],
    });
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Store not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const { name, address_id, timezone, external_store_id } = req.body || {};
    if (!name) return res.status(400).json({ error: 'bad_request', message: 'name is required' });

    if (address_id) {
      const addr = await db.Address.findByPk(address_id);
      if (!addr) return res.status(400).json({ error: 'bad_request', message: 'address_id invalid' });
    }

    const row = await db.Store.create({
      name,
      address_id: address_id || null,
      timezone: timezone || null,
      external_store_id: external_store_id || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json(row);
  } catch (e) {
    if (e?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'conflict', message: 'external_store_id already exists' });
    }
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const row = await db.Store.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Store not found' });

    const { name, address_id, timezone, external_store_id } = req.body || {};

    if (address_id !== undefined && address_id !== null) {
      const addr = await db.Address.findByPk(address_id);
      if (!addr) return res.status(400).json({ error: 'bad_request', message: 'address_id invalid' });
    }

    if (name !== undefined) row.name = name;
    if (address_id !== undefined) row.address_id = address_id || null;
    if (timezone !== undefined) row.timezone = timezone || null;
    if (external_store_id !== undefined) row.external_store_id = external_store_id || null;

    row.updated_at = new Date();
    await row.save();
    res.json(row);
  } catch (e) {
    if (e?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'conflict', message: 'external_store_id already exists' });
    }
    next(e);
  }
}
