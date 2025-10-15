import db from '../models/index.js';

// simple helpers
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
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
        { model: db.InstallationItem, as: 'items', attributes: ['id','external_product_id','quantity','room_tag'] },
        { model: db.CrewAssignment, as: 'crew', attributes: ['id','crew_user_id','role','accepted_at'] }
      ]
    });
    res.json({ data: rows, limit, offset });
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const row = await db.Installation.findByPk(id, {
      include: [
        { model: db.Store, as: 'store', attributes: ['id','name','external_store_id'] },
        { model: db.InstallationItem, as: 'items' },
        { model: db.CrewAssignment, as: 'crew',
          include: [{ model: db.User, as: 'crew', attributes: ['id','name','email'] }]
        }
      ]
    });
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const { external_order_id, store_id, scheduled_start, scheduled_end, status, notes } = req.body || {};
    if (!external_order_id || !store_id) return bad(res, 'external_order_id and store_id are required');
    const row = await db.Installation.create({
      external_order_id,
      store_id,
      scheduled_start: scheduled_start || null,
      scheduled_end: scheduled_end || null,
      status: status || 'scheduled',
      notes: notes || null,
      created_by: req.user?.sub || null,
      updated_by: req.user?.sub || null
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
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
  } catch (e) { next(e); }
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
  } catch (e) { next(e); }
}

export async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['scheduled','in_progress','completed','failed','canceled'];
    if (!allowed.includes(status)) return bad(res, `status must be one of: ${allowed.join(', ')}`);

    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    inst.status = status;
    inst.updated_by = req.user?.sub || inst.updated_by || null;
    await inst.save();
    res.json(inst);
  } catch (e) { next(e); }
}
