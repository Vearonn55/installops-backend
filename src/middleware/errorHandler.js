// src/middleware/errorHandler.js (ensure this shape)
export default (err, req, res, _next) => {
  const status = err.status || 500;
  const payload = {
    error: err.code || 'internal_error',
    message: err.publicMessage || 'Something went wrong',
    request_id: req.id,
    ...(process.env.NODE_ENV !== 'production' && { debug: err.message }),
  };
  res.status(status).json(payload);
};
