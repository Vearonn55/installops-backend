// src/middleware/authorize.js
export default function authorize(...required) {
  return (req, res, next) => {
    const perms = req.session?.user?.permissions || [];

    // Global admin override
    if (perms.includes('admin:*')) {
      return next();
    }

    // If route did not specify any required permissions, just allow
    if (!required || required.length === 0) {
      return next();
    }

    // OR semantics: user must have at least one of the required permissions
    const ok = required.some((p) => perms.includes(p));

    if (!ok) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient permissions',
      });
    }

    return next();
  };
}
