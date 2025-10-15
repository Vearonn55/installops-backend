// src/config/index.js
export default {
  env: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: (process.env.CORS_ORIGIN || '*').split(','),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 15000), // 15s default
  port: Number(process.env.PORT || 8000),
};
