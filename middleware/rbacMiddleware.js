const rbacMiddleware = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Access denied. SuperAdmin role required.' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'RBAC middleware error.', error: error.message });
  }
};

module.exports = rbacMiddleware;
