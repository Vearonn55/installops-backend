export default function authorize(...required) {
  return (req, res, next) => {
    const perms = req.session?.user?.permissions || [];
    if (perms.includes('admin:*')) return next();

    const ok = required.every(p => perms.includes(p));
    if (!ok) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient permissions'
      });
    }
    next();
  };
}
