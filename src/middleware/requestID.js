// src/middleware/requestId.js
import { randomUUID } from 'crypto';
export default (req, _res, next) => { req.id = req.headers['x-request-id'] || randomUUID(); next(); };
