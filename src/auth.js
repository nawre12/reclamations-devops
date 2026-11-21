const jwt = require('jsonwebtoken');
const config = require('./config');

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.getJwtSecret(), {
    expiresIn: '2h',
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    const payload = jwt.verify(token, config.getJwtSecret());
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

module.exports = { signToken, requireAuth };
