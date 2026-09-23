const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.momo_admin_token;
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
}

module.exports = { requireAdmin };
