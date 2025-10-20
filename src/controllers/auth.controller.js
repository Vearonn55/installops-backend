import bcrypt from 'bcrypt';
import db from '../models/index.js';


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
      return res
        .status(401)
        .json({ error: 'unauthorized', message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
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

      // minimal identity in session
      req.session.user = {
        id: user.id,
        role_id: user.role_id,
        role: user.role?.name || null,
        permissions: Array.isArray(user.role?.permissions)
          ? user.role.permissions
          : [],
      };

      // optional: update last login
      try {
        user.last_login_at = new Date();
        await user.save({ fields: ['last_login_at'] });
      } catch (_) {
        /* ignore */
      }

      // ✅ move response *inside* callback, no "return" outside
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
      return res.status(400).json({ error: 'bad_request', message: 'name, email, password are required' });
    }
    if (!pwOk(password)) {
      return res.status(400).json({ error: 'bad_request', message: `password must be at least ${MIN_PW} chars` });
    }

    // allow only when there are no users yet
    const userCount = await db.User.count();
    if (userCount > 0) {
      return res.status(403).json({ error: 'forbidden', message: 'registration disabled (use admin to create users)' });
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
    if (exists) return res.status(409).json({ error: 'conflict', message: 'email already registered' });

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
      res.status(201).json({
        message: 'register_ok',
        user: { id: user.id, name: user.name, email: user.email, role: 'admin' }
      });
    });
  } catch (e) {
    next(e);
  }
}
