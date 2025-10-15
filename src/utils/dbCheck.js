// src/utils/dbCheck.js
import db from '../models/index.js';

export default async function dbCheck() {
  try {
    await db.sequelize.authenticate();
    const [[{ users }]] = await db.sequelize.query(
      'SELECT COUNT(*)::int AS users FROM users'
    );
    const [[{ installs }]] = await db.sequelize.query(
      'SELECT COUNT(*)::int AS installs FROM installations'
    );

    console.log(
      `✅  Database OK — users=${users} | installations=${installs}`
    );
  } catch (err) {
    console.error('❌  Database connection failed:', err.message);
  }
}
