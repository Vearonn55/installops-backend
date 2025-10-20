import db from '../models/index.js';

const toInt = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// ---------------- Templates ----------------
export async function listTemplates(req, res, next) {
  try {
    const limit = toInt(req.query.limit, 20);
    const offset = toInt(req.query.offset, 0);
    const q = (req.query.q || '').trim();

    const where = {};
    if (q) {
      where.name = db.Sequelize.where(
        db.Sequelize.fn('LOWER', db.Sequelize.col('name')),
        'LIKE',
        `%${q.toLowerCase()}%`
      );
    }

    const { rows, count } = await db.ChecklistTemplate.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({ data: rows, total: count, limit, offset });
  } catch (e) { next(e); }
}

export async function getTemplate(req, res, next) {
  try {
    const row = await db.ChecklistTemplate.findByPk(req.params.id, {
      include: [{ model: db.ChecklistItem, as: 'items', order: [['order_index', 'ASC']] }],
    });
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Template not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export async function createTemplate(req, res, next) {
  try {
    const { name, version, description, rules } = req.body || {};
    if (!name) return res.status(400).json({ error: 'bad_request', message: 'name is required' });

    const row = await db.ChecklistTemplate.create({
      name,
      version: version || null,
      description: description || null,
      rules: rules || null,
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
}

export async function updateTemplate(req, res, next) {
  try {
    const row = await db.ChecklistTemplate.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Template not found' });

    const { name, version, description, rules } = req.body || {};
    if (name !== undefined) row.name = name;
    if (version !== undefined) row.version = version;
    if (description !== undefined) row.description = description;
    if (rules !== undefined) row.rules = rules;

    await row.save();
    res.json(row);
  } catch (e) { next(e); }
}

// ---------------- Template Items ----------------
export async function listTemplateItems(req, res, next) {
  try {
    const { id } = req.params; // template id
    const tpl = await db.ChecklistTemplate.findByPk(id);
    if (!tpl) return res.status(404).json({ error: 'not_found', message: 'Template not found' });

    const limit = toInt(req.query.limit, 50);
    const offset = toInt(req.query.offset, 0);

    const { rows, count } = await db.ChecklistItem.findAndCountAll({
      where: { template_id: id },
      order: [['order_index', 'ASC'], ['created_at', 'ASC']],
      limit,
      offset,
    });

    res.json({ data: rows, total: count, limit, offset });
  } catch (e) { next(e); }
}

export async function createTemplateItem(req, res, next) {
  try {
    const { id } = req.params; // template id
    const tpl = await db.ChecklistTemplate.findByPk(id);
    if (!tpl) return res.status(404).json({ error: 'not_found', message: 'Template not found' });

    const {
      key, label, type, required, order_index,
      rules, help_text, options
    } = req.body || {};

    if (!key || !label) {
      return res.status(400).json({ error: 'bad_request', message: 'key and label are required' });
    }

    const row = await db.ChecklistItem.create({
      template_id: id,
      key,
      label,
      type: type || 'text',
      required: !!required,
      order_index: Number.isFinite(Number(order_index)) ? Number(order_index) : 0,
      rules: rules || null,
      help_text: help_text || null,
      options: options || null,
    });

    res.status(201).json(row);
  } catch (e) { next(e); }
}

export async function updateChecklistItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const item = await db.ChecklistItem.findByPk(itemId);
    if (!item) return res.status(404).json({ error: 'not_found', message: 'Checklist item not found' });

    const {
      key, label, type, required, order_index, rules, help_text, options
    } = req.body || {};

    if (key !== undefined) item.key = key;
    if (label !== undefined) item.label = label;
    if (type !== undefined) item.type = type;
    if (required !== undefined) item.required = !!required;
    if (order_index !== undefined) item.order_index = Number(order_index);
    if (rules !== undefined) item.rules = rules;
    if (help_text !== undefined) item.help_text = help_text;
    if (options !== undefined) item.options = options;

    await item.save();
    res.json(item);
  } catch (e) { next(e); }
}

// ---------------- Installation Responses ----------------
export async function listInstallChecklistResponses(req, res, next) {
  try {
    const { id } = req.params; // installation id
    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const limit = toInt(req.query.limit, 50);
    const offset = toInt(req.query.offset, 0);

    const { rows, count } = await db.ChecklistResponse.findAndCountAll({
      where: { installation_id: id },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [{ model: db.ChecklistItem, as: 'item' }]
    });

    res.json({ data: rows, total: count, limit, offset });
  } catch (e) { next(e); }
}

export async function upsertInstallChecklistResponse(req, res, next) {
  try {
    const { id } = req.params; // installation id
    const inst = await db.Installation.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'not_found', message: 'Installation not found' });

    const { item_id, value, completed_at } = req.body || {};
    if (!item_id) return res.status(400).json({ error: 'bad_request', message: 'item_id required' });

    const item = await db.ChecklistItem.findByPk(item_id);
    if (!item) return res.status(404).json({ error: 'not_found', message: 'Checklist item not found' });

    // upsert by (installation_id, item_id)
    const [row, created] = await db.ChecklistResponse.findOrCreate({
      where: { installation_id: id, item_id },
      defaults: {
        installation_id: id,
        item_id,
        value: value ?? null,
        completed_at: completed_at ? new Date(completed_at) : null,
        created_by: req.session?.user?.id || null,
      },
    });

    if (!created) {
      if (value !== undefined) row.value = value;
      if (completed_at !== undefined) row.completed_at = completed_at ? new Date(completed_at) : null;
      await row.save();
    }

    res.status(created ? 201 : 200).json(row);
  } catch (e) { next(e); }
}

export async function updateChecklistResponse(req, res, next) {
  try {
    const { id } = req.params; // response id
    const row = await db.ChecklistResponse.findByPk(id);
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Response not found' });

    const { value, completed_at } = req.body || {};
    if (value !== undefined) row.value = value;
    if (completed_at !== undefined) row.completed_at = completed_at ? new Date(completed_at) : null;

    await row.save();
    res.json(row);
  } catch (e) { next(e); }
}
