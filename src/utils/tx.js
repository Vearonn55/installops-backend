// src/utils/tx.js
import db from '../models/index.js';
export const withTx = async (fn) => db.sequelize.transaction(async (t) => fn(t));
