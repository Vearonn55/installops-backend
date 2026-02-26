#!/usr/bin/env node
/**
 * Initialize database and bootstrap: create DB, sync tables, seed roles,
 * prompt for one admin user (name, email, password + confirm), and up to 4 stores (blank to skip).
 * Run from backend/ (git root). Requires .env with DB_*, SESSION_SECRET.
 *
 * Usage: npm run init   or   node scripts/init.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_NAME = process.env.DB_NAME || 'installops';
const DB_USER = process.env.DB_USER || 'installops';
const DB_PASS = process.env.DB_PASS || '';

function question(prompt, defaultValue = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const p = defaultValue ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
  return new Promise((resolve) => {
    rl.question(p, (answer) => {
      rl.close();
      resolve((answer || defaultValue).trim());
    });
  });
}

async function ensureDatabase() {
  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
  });
  try {
    await client.connect();
  } catch (e) {
    console.error('Cannot connect to PostgreSQL (database "postgres"). Check DB_HOST, DB_PORT, DB_USER, DB_PASS.');
    throw e;
  }
  const { rows } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [DB_NAME]
  );
  if (rows.length === 0) {
    try {
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Created database "${DB_NAME}".`);
    } catch (e) {
      await client.end();
      console.error('Could not create database. Ensure the DB user has CREATEDB or create it manually:');
      console.error(`  CREATE DATABASE "${DB_NAME}";`);
      throw e;
    }
  }
  await client.end();
}

async function main() {
  console.log('InstallOps — initialize database and bootstrap\n');

  if (!DB_PASS && process.env.NODE_ENV !== 'development') {
    console.error('DB_PASS must be set in .env');
    process.exit(1);
  }

  await ensureDatabase();

  const { default: db } = await import('../src/models/index.js');

  await db.sequelize.authenticate();
  console.log('Connected to database.');

  await db.sequelize.sync();
  console.log('Tables synced.');

  await db.sequelize.query('CREATE SEQUENCE IF NOT EXISTS install_code_seq;');
  console.log('Sequence install_code_seq ready.');

  const roles = [
    { name: 'admin', permissions: ['admin:*'] },
    { name: 'manager', permissions: ['manager:*'] },
    { name: 'crew', permissions: ['crew:*'] },
  ];
  for (const r of roles) {
    const [role] = await db.Role.findOrCreate({
      where: { name: r.name },
      defaults: { permissions: r.permissions },
    });
    if (role.createdAt && role.updatedAt) console.log(`Role "${r.name}" created.`);
  }
  console.log('Roles ready: admin, manager, crew.\n');

  const adminRole = await db.Role.findOne({ where: { name: 'admin' } });
  if (!adminRole) {
    console.error('Admin role not found.');
    process.exit(1);
  }

  let name = '';
  let email = '';
  let password = '';
  let passwordConfirm = '';

  while (!name) {
    name = await question('Admin user name');
    if (!name) console.log('Name is required.');
  }
  while (!email) {
    email = await question('Admin user email');
    if (!email) console.log('Email is required.');
  }
  const existing = await db.User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.error('A user with that email already exists.');
    process.exit(1);
  }

  while (!password || password.length < 8) {
    password = await question('Password (min 8 characters)');
    if (password.length < 8) console.log('Password must be at least 8 characters.');
  }
  while (passwordConfirm !== password) {
    passwordConfirm = await question('Confirm password');
    if (passwordConfirm !== password) console.log('Passwords do not match.');
  }

  const password_hash = await bcrypt.hash(password, 12);
  await db.User.create({
    name,
    email: email.toLowerCase(),
    password_hash,
    role_id: adminRole.id,
    status: 'active',
  });
  console.log(`User "${name}" created with admin role.\n`);

  console.log('Stores (up to 4). Enter a name/slug (e.g. girne-weltew) or leave blank to skip.\n');
  for (let i = 1; i <= 4; i++) {
    const slug = await question(`Store ${i} name/slug`);
    if (!slug) continue;
    await db.Store.create({
      name: slug,
      external_store_id: slug,
    });
    console.log(`Store "${slug}" created.`);
  }

  console.log('\nDone. Start the app with: npm start');
  await db.sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
