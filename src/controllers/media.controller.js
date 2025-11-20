// src/controllers/media.controller.js
import db from '../models/index.js';
import { logAudit } from '../services/audit.service.js';

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

// GET /installations/:id/media
export async function listForInstallation(req, res, next) {
  try {
    const installation_id = req.params.id;
    const limit  = Math.min(Math.max(parseInt(req.query.limit || 20, 10), 1), 100);
    const offset = Math.max(parseInt(req.query.offset || 0, 10), 0);

    // ensure installation exists (404 if not)
    const inst = await db.Installation.findByPk(installation_id);
    if (!inst) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Installation not found' });
    }

    const where = { installation_id };
    if (req.query.type) where.type = req.query.type;

    const { rows, count } = await db.MediaAsset.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({ data: rows, total: count, limit, offset });
  } catch (e) {
    next(e);
  }
}

// POST /installations/:id/media
export async function createForInstallation(req, res, next) {
  try {
    const installation_id = req.params.id;
    const inst = await db.Installation.findByPk(installation_id);
    if (!inst) {
      return res
        .status(404)
        .json({ error: 'not_found', message: 'Installation not found' });
    }

    const { url, type, tags, sha256, metadata } = req.body || {};
    if (!url || !type) {
      return res
        .status(400)
        .json({ error: 'bad_request', message: 'url and type are required' });
    }

    // basic shape checks
    if (tags && typeof tags !== 'object') {
      return res
        .status(400)
        .json({
          error: 'bad_request',
          message: 'tags must be an object (JSON)',
        });
    }

    const now = new Date();
    const asset = await db.MediaAsset.create({
      installation_id,
      url,
      type,
      tags: tags || null,
      sha256: sha256 || null,
      metadata: metadata || null,
      created_by: req.session?.user?.id || null,
      created_at: now,
      updated_at: now,
    });

    // 🔍 Audit: media.create
    await logAudit(req, {
      action: 'media.create',
      entity: 'media',
      entityId: asset.id,
      data: {
        installation_id,
        url: asset.url,
        type: asset.type,
        tags: asset.tags,
        sha256: asset.sha256,
        metadata: asset.metadata,
        created_by: asset.created_by,
      },
    });

    res.status(201).json(asset);
  } catch (e) {
    next(e);
  }
}

// GET /media/:id
export async function getOne(req, res, next) {
  try {
    const asset = await db.MediaAsset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ error: 'not_found' });
    res.json(asset);
  } catch (e) {
    next(e);
  }
}

// DELETE /media/:id
export async function destroy(req, res, next) {
  try {
    const asset = await db.MediaAsset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ error: 'not_found' });

    const snapshot = asset.toJSON();

    await asset.destroy();

    // 🔍 Audit: media.delete
    await logAudit(req, {
      action: 'media.delete',
      entity: 'media',
      entityId: req.params.id,
      data: pick(snapshot, [
        'installation_id',
        'url',
        'type',
        'tags',
        'sha256',
        'metadata',
        'created_by',
        'created_at',
      ]),
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
