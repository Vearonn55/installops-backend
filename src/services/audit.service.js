// backend/src/services/audit.service.js
import db from '../models/index.js';

const { AuditLog } = db;

/**
 * Write an audit log entry.
 *
 * @param {Request} req - Express request (for actor + ip).
 * @param {Object} opts
 * @param {string} opts.action - e.g. "user.create", "installation.update_status"
 * @param {string} opts.entity - e.g. "user", "installation", "media"
 * @param {string|null} [opts.entityId] - UUID of the entity, if any
 * @param {Object|null} [opts.data] - Extra JSON payload (before/after, etc.)
 */
export async function logAudit(req, { action, entity, entityId = null, data = null }) {
  try {
    const actorId = req.user?.id ?? null; // assumes auth middleware sets req.user
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) ||
      req.ip ||
      null;

    await AuditLog.create({
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId,
      data,
      ip,
      // created_at is defaulted in the model
    });
  } catch (err) {
    // NEVER break the main request because of audit failure
    console.error('[audit] failed to write log', {
      action,
      entity,
      error: err.message,
    });
  }
}
