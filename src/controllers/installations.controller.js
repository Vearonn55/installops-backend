import db from '../models/index.js';

// helpers
const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
const bad = (res, msg, code = 400) => res.status(code).json({ error: 'bad_request', message: msg });

export async function list(req, res, next) {
  try {
    const { external_order_id, store_id, status } = req.query;
    const limit = num(req.query.limit, 20);
    const offset = num(req.query.offset, 0);

    const where = {};
    if (external_order_id) where.external_order_id = external_order_id;
    if (store_id) where.store_id = store_id;
    if (status) where.status = status;

    const rows = await db.Installation.findAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { model: db.InstallationItem, as: 'items', attributes: ['id', 'external_product_id', 'quantity', 'room_tag'] },
        { model: db.CrewAssignment, as: 'crew', attributes: ['id', 'crew_user_id', 'role', 'accepted_at'] }
      ]
    });

    res.json({ data: rows, limit, offset });
  } catch (e) {
    next(e);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;

    const row = await db.Installation.findByPk(id, {
      include: [
        { model: db.Store, as: 'store', attributes: ['id', 'name', 'external_store_id'] },
        { model: db.InstallationItem, as: 'items' },
        {
          model: db.CrewAssignment,
          as: 'crew',
          include: [{ model: db.User, as: 'crew', attributes: ['id', 'name', 'email'] }]
        }
      ]
    });

    if (!row) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const { external_order_id, store_id, scheduled_start, scheduled_end, status, notes } = req.body || {};
    if (!external_order_id || !store_id) return bad(res, 'external_order_id and store_id are required');

    const actorId = req.session?.user?.id || null;

    const row = await db.Installation.create({
      external_order_id,
      store_id,
      scheduled_start: scheduled_start || null,
      scheduled_end: scheduled_end || null,
      status: status || 'scheduled',
      notes: notes || null,
      created_by: actorId,
      updated_by: actorId
    });

    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function addItem(req, res, next) {
  try {
    const { id } = req.params;
    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const { external_product_id, quantity, room_tag, special_instructions } = req.body || {};
    if (!external_product_id) return bad(res, 'external_product_id is required');

    const item = await db.InstallationItem.create({
      installation_id: id,
      external_product_id,
      quantity: Number.isFinite(Number(quantity)) ? Number(quantity) : 1,
      room_tag: room_tag || null,
      special_instructions: special_instructions || null
    });

    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
}

export async function assignCrew(req, res, next) {
  try {
    const { id } = req.params;
    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const { crew_user_id, role } = req.body || {};
    if (!crew_user_id) return bad(res, 'crew_user_id is required');

    const user = await db.User.findByPk(crew_user_id);
    if (!user) return bad(res, 'crew_user_id invalid', 404);

    const ca = await db.CrewAssignment.create({
      installation_id: id,
      crew_user_id,
      role: role || null,
      accepted_at: new Date()
    });

    res.status(201).json(ca);
  } catch (e) {
    next(e);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['scheduled', 'in_progress', 'completed', 'failed', 'canceled'];
    if (!allowed.includes(status)) return bad(res, `status must be one of: ${allowed.join(', ')}`);

    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    inst.status = status;
    inst.updated_by = req.session?.user?.id || inst.updated_by || null;
    await inst.save();

    res.json(inst);
  } catch (e) {
    next(e);
  }
}


// ---------- INSTALLATION ITEMS ----------

export async function listItems(req, res, next) {
  try {
    const { id } = req.params;
    const limit  = num(req.query.limit, 20);
    const offset = num(req.query.offset, 0);

    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const { rows, count } = await db.InstallationItem.findAndCountAll({
      where: { installation_id: id },
      order: [['created_at', 'DESC']],
      limit, offset,
    });

    res.json({ data: rows, total: count, limit, offset });
  } catch (e) { next(e); }
}

export async function updateItem(req, res, next) {
  try {
    const { id, itemId } = req.params;
    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const item = await db.InstallationItem.findOne({ where: { id: itemId, installation_id: id } });
    if (!item) return res.status(404).json({ error: 'not_found', message: 'Item not found' });

    const { quantity, room_tag, special_instructions } = req.body || {};
    if (quantity !== undefined) {
      const q = Number(quantity);
      if (!Number.isFinite(q) || q < 1) return bad(res, 'quantity must be >= 1');
      item.quantity = q;
    }
    if (room_tag !== undefined) item.room_tag = room_tag || null;
    if (special_instructions !== undefined) item.special_instructions = special_instructions || null;

    await item.save();
    res.json(item);
  } catch (e) { next(e); }
}

export async function removeItem(req, res, next) {
  try {
    const { id, itemId } = req.params;
    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const item = await db.InstallationItem.findOne({ where: { id: itemId, installation_id: id } });
    if (!item) return res.status(404).json({ error: 'not_found', message: 'Item not found' });

    await item.destroy();
    res.status(204).send();
  } catch (e) { next(e); }
}

// ---------- CREW ASSIGNMENTS ----------

export async function listCrew(req, res, next) {
  try {
    const { id } = req.params;
    const limit  = num(req.query.limit, 20);
    const offset = num(req.query.offset, 0);

    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const { rows, count } = await db.CrewAssignment.findAndCountAll({
      where: { installation_id: id },
      order: [['created_at', 'DESC']],
      limit, offset,
      include: [{ model: db.User, as: 'crew', attributes: ['id','name','email'] }],
    });

    res.json({ data: rows, total: count, limit, offset });
  } catch (e) { next(e); }
}

export async function updateAssignment(req, res, next) {
  try {
    const { id, asgnId } = req.params;
    const { role, accepted, declined } = req.body || {};

    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const ca = await db.CrewAssignment.findOne({ where: { id: asgnId, installation_id: id } });
    if (!ca) return res.status(404).json({ error: 'not_found', message: 'Assignment not found' });

    if (role !== undefined) ca.role = role || null;

    // mutually exclusive accept/decline flags; latest wins if both sent
    const now = new Date();
    if (accepted === true) {
      ca.accepted_at = now;
      ca.declined_at = null;
    } else if (declined === true) {
      ca.declined_at = now;
      ca.accepted_at = null;
    }

    await ca.save();
    res.json(ca);
  } catch (e) { next(e); }
}

export async function removeAssignment(req, res, next) {
  try {
    const { id, asgnId } = req.params;

    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const ca = await db.CrewAssignment.findOne({ where: { id: asgnId, installation_id: id } });
    if (!ca) return res.status(404).json({ error: 'not_found', message: 'Assignment not found' });

    await ca.destroy();
    res.status(204).send();
  } catch (e) { next(e); }
}


// PATCH /installations/:id  -- update scheduled_start / scheduled_end / notes
export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { scheduled_start, scheduled_end, notes } = req.body ?? {};

    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    // Build partial update
    const updates = {};

    // scheduled_start: allow null to clear
    if (scheduled_start !== undefined) {
      if (scheduled_start === null) {
        updates.scheduled_start = null;
      } else {
        const d = new Date(scheduled_start);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'bad_request', message: 'scheduled_start must be ISO date-time or null' });
        }
        updates.scheduled_start = d;
      }
    }

    // scheduled_end: allow null to clear
    if (scheduled_end !== undefined) {
      if (scheduled_end === null) {
        updates.scheduled_end = null;
      } else {
        const d = new Date(scheduled_end);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'bad_request', message: 'scheduled_end must be ISO date-time or null' });
        }
        updates.scheduled_end = d;
      }
    }

    // If both provided and non-null, enforce start <= end
    const startVal = updates.hasOwnProperty('scheduled_start') ? updates.scheduled_start : inst.scheduled_start;
    const endVal   = updates.hasOwnProperty('scheduled_end')   ? updates.scheduled_end   : inst.scheduled_end;
    if (startVal && endVal && startVal > endVal) {
      return res.status(400).json({ error: 'bad_request', message: 'scheduled_start must be before or equal to scheduled_end' });
    }

    if (notes !== undefined) {
      if (notes !== null && typeof notes !== 'string') {
        return res.status(400).json({ error: 'bad_request', message: 'notes must be a string or null' });
      }
      updates.notes = notes;
    }

    // audit field if you keep it
    updates.updated_by = req.session?.user?.id || null;

    await inst.update(updates, { fields: Object.keys(updates) });

    // Return the updated record (flat; detail endpoint includes items/crew)
    res.json({
      id: inst.id,
      external_order_id: inst.external_order_id,
      store_id: inst.store_id,
      scheduled_start: inst.scheduled_start,
      scheduled_end: inst.scheduled_end,
      status: inst.status,
      notes: inst.notes,
      created_by: inst.created_by,
      updated_by: inst.updated_by,
      created_at: inst.created_at,
      updated_at: inst.updated_at
    });
  } catch (e) {
    next(e);
  }
}
