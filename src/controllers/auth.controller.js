import bcrypt from 'bcrypt';
import db from '../models/index.js';
import { logAudit } from '../services/audit.service.js';

const MIN_PW = 8;
const pwOk = (s = '') => typeof s === 'string' && s.length >= MIN_PW;

// SESSION-BASED AUTH (no JWT)

export async function login(req, res, next) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'bad_request', message: 'Email and password required' });
    }

    const user = await db.User.findOne({
      where: { email },
      include: [{ model: db.Role, as: 'role' }],
    });

    if (!user?.password_hash) {
      await logAudit(req, {
        action: 'auth.login_failed',
        entity: 'user',
        entityId: null,
        data: { email, reason: 'invalid_credentials' },
      });

      return res
        .status(401)
        .json({ error: 'unauthorized', message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      await logAudit(req, {
        action: 'auth.login_failed',
        entity: 'user',
        entityId: user.id,
        data: { email, reason: 'invalid_credentials' },
      });

      return res
        .status(401)
        .json({ error: 'unauthorized', message: 'Invalid credentials' });
    }

    // rotate session ID to prevent fixation
    req.session.regenerate(async (err) => {
      if (err) {
        console.error('Session regeneration failed:', err);
        return next(err);
      }

      // -------- PERMISSIONS NORMALIZATION FIX --------
      let perms = user.role?.permissions ?? [];

      // If stored as JSON string in DB, parse it
      if (typeof perms === 'string') {
        try {
          const parsed = JSON.parse(perms);
          perms = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          perms = [];
        }
      }

      // Ensure it's always a real JS array
      if (!Array.isArray(perms)) {
        perms = [];
      }
      // ------------------------------------------------

      // minimal identity in session
      req.session.user = {
        id: user.id,
        role_id: user.role_id,
        role: user.role?.name || null,
        permissions: perms,
      };

      // optional: update last login
      try {
        user.last_login_at = new Date();
        await user.save({ fields: ['last_login_at'] });
      } catch (_) {}

      // audit successful login
      logAudit(req, {
        action: 'auth.login',
        entity: 'user',
        entityId: user.id,
        data: { email: user.email },
      }).catch(() => {});

      res.status(200).json({
        message: 'login_ok',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name || null,
        },
      });
    });
  } catch (e) {
    next(e);
  }
}

export async function me(req, res) {
  const u = req.session?.user;
  if (!u) return res.status(401).json({ error: 'unauthorized' });

  res.json({
    id: u.id,
    role_id: u.role_id || null,
    role: u.role || null,
    permissions: u.permissions || [],
  });
}

export async function logout(req, res) {
  // log before destroying the session so we still have actor_id
  if (req.session?.user?.id) {
    logAudit(req, {
      action: 'auth.logout',
      entity: 'user',
      entityId: req.session.user.id,
      data: null,
    }).catch(() => { /* ignore */ });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res
        .status(500)
        .json({ error: 'internal_error', message: 'Failed to destroy session' });
    }

    res.clearCookie('sid');
    res.json({ message: 'logged_out' });
  });
}

export async function register(req, res, next) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const name = (req.body?.name || '').trim();
    const password = req.body?.password || '';

    if (!email || !name || !password) {
      return res
        .status(400)
        .json({ error: 'bad_request', message: 'name, email, password are required' });
    }
    if (!pwOk(password)) {
      return res
        .status(400)
        .json({ error: 'bad_request', message: `password must be at least ${MIN_PW} chars` });
    }

    // allow only when there are no users yet
    const userCount = await db.User.count();
    if (userCount > 0) {
      // registration disabled after bootstrap
      await logAudit(req, {
        action: 'auth.register_forbidden',
        entity: 'user',
        entityId: null,
        data: { email, reason: 'bootstrap_already_done' },
      });

      return res
        .status(403)
        .json({
          error: 'forbidden',
          message: 'registration disabled (use admin to create users)',
        });
    }

    // ensure admin role exists (or create it)
    let adminRole = await db.Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      adminRole = await db.Role.create({
        name: 'admin',
        permissions: ['admin:*'],
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // unique email check
    const exists = await db.User.findOne({ where: { email } });
    if (exists) {
      await logAudit(req, {
        action: 'auth.register_conflict',
        entity: 'user',
        entityId: exists.id,
        data: { email, reason: 'email_already_registered' },
      });

      return res
        .status(409)
        .json({ error: 'conflict', message: 'email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const now = new Date();

    const user = await db.User.create({
      name,
      email,
      role_id: adminRole.id,
      password_hash,
      status: 'active',
      created_at: now,
      updated_at: now
    });

    // session fixation protection + auto-login
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.user = {
        id: user.id,
        role_id: user.role_id,
        role: 'admin',
        permissions: ['admin:*']
      };

      // audit bootstrap registration
      logAudit(req, {
        action: 'auth.register_bootstrap',
        entity: 'user',
        entityId: user.id,
        data: { email: user.email, name: user.name },
      }).catch(() => { /* ignore */ });

      res.status(201).json({
        message: 'register_ok',
        user: { id: user.id, name: user.name, email: user.email, role: 'admin' }
      });
    });
  } catch (e) {
    next(e);
  }
}
