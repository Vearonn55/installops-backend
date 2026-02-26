// src/controllers/orders.controller.js
// Order = external_order_id; one order can have many installations.
// Endpoints for frontend: list installations for an order, chronological timeline of events.

import db from '../models/index.js';
const { Op } = db.Sequelize;

/**
 * GET /orders/:external_order_id/installations
 * List all installations for this order (id = external_order_id), in a stable order.
 */
export async function listInstallations(req, res, next) {
  try {
    const { external_order_id } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit || 50, 10), 1), 100);
    const offset = Math.max(parseInt(req.query.offset || 0, 10), 0);

    const { rows, count } = await db.Installation.findAndCountAll({
      where: { external_order_id },
      order: [['created_at', 'ASC']],
      limit,
      offset,
      include: [
        { model: db.Store, as: 'store', attributes: ['id', 'name', 'external_store_id'] },
        {
          model: db.InstallationItem,
          as: 'items',
          attributes: ['id', 'external_product_id', 'quantity', 'room_tag'],
        },
        {
          model: db.CrewAssignment,
          as: 'crew',
          attributes: ['id', 'crew_user_id', 'role', 'accepted_at', 'declined_at'],
          include: [{ model: db.User, as: 'crew', attributes: ['id', 'name', 'email'] }],
        },
      ],
    });

    res.json({
      order_id: external_order_id,
      data: rows,
      total: count,
      limit,
      offset,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /orders/:external_order_id/timeline
 * Chronological list of events for this order (all installations under this external_order_id).
 * Events come from audit_logs: installation, installation_item, crew_assignment, media, checklist_response.
 */
export async function getTimeline(req, res, next) {
  try {
    const { external_order_id } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit || 200, 10), 1), 500);
    const offset = Math.max(parseInt(req.query.offset || 0, 10), 0);

    const installations = await db.Installation.findAll({
      where: { external_order_id },
      attributes: ['id', 'install_code', 'status', 'created_at'],
      order: [['created_at', 'ASC']],
    });

    if (installations.length === 0) {
      return res.json({
        order_id: external_order_id,
        installations: [],
        timeline: { data: [], total: 0, limit, offset },
      });
    }

    const installationIds = installations.map((i) => i.id);

    // Audit logs where:
    // - entity = 'installation' and entity_id in our installation ids, OR
    // - data->>'installation_id' is one of our installation ids (for child entities)
    const whereClause = {
      [Op.or]: [
        { entity: 'installation', entity_id: { [Op.in]: installationIds } },
        db.sequelize.where(
          db.sequelize.literal("(data->>'installation_id')"),
          { [Op.in]: installationIds }
        ),
      ],
    };

    const [logs, total] = await Promise.all([
      db.AuditLog.findAll({
        where: whereClause,
        order: [['created_at', 'ASC']],
        limit,
        offset,
        raw: true,
      }),
      db.AuditLog.count({
        where: whereClause,
      }),
    ]);

    const installById = new Map(installations.map((i) => [i.id, i]));

    const timeline = logs.map((log) => {
      const installationId =
        log.entity === 'installation'
          ? log.entity_id
          : log.data?.installation_id ?? null;
      const inst = installationId ? installById.get(installationId) : null;
      return {
        id: log.id,
        at: log.created_at,
        action: log.action,
        entity: log.entity,
        entity_id: log.entity_id,
        data: log.data,
        actor_id: log.actor_id,
        installation_id: installationId,
        install_code: inst?.install_code ?? null,
      };
    });

    res.json({
      order_id: external_order_id,
      installations: installations.map((i) => ({
        id: i.id,
        install_code: i.install_code,
        status: i.status,
        created_at: i.created_at,
      })),
      timeline: {
        data: timeline,
        total,
        limit,
        offset,
      },
    });
  } catch (e) {
    next(e);
  }
}
