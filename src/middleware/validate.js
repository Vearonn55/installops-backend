// src/middleware/validate.js
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = {};
    if (schema.body) parsed.body = schema.body.parse(req.body);
    if (schema.query) parsed.query = schema.query.parse(req.query);
    if (schema.params) parsed.params = schema.params.parse(req.params);
    req.valid = { ...parsed.body && { body: parsed.body }, ...parsed.query && { query: parsed.query }, ...parsed.params && { params: parsed.params } };
    next();
  } catch (e) {
    return res.status(400).json({ error: 'validation_error', details: e.errors ?? e.message });
  }
};
