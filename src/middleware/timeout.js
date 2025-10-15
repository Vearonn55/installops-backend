// src/middleware/timeout.js
import config from '../config/index.js';
export default (req, res, next) => {
  req.setTimeout(config.requestTimeoutMs);
  res.setTimeout(config.requestTimeoutMs);
  next();
};
