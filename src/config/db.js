// src/config/db.js
import { Sequelize } from 'sequelize';
import config from './index.js';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'installops',
  process.env.DB_USER || 'vearon',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: config.env === 'development' ? console.log : false,
    define: { underscored: true }, // match snake_case columns
    pool: { max: 10, min: 0, idle: 10000 }
  }
);

export default sequelize;
