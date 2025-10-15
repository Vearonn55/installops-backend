// src/models/index.js
import { Sequelize, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = { sequelize, Sequelize };

// load all *.model.js in this folder (ESM dynamic import)
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.model.js'));

for (const f of files) {
  const mod = await import(pathToFileURL(path.join(__dirname, f)));
  const define = mod.default;
  const model = define(sequelize, DataTypes);
  db[model.name] = model;
}

// run associate() if present
Object.values(db).forEach(m => typeof m.associate === 'function' && m.associate(db));

export default db;
