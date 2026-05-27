const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'aghartu-2026';

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Токен жоқ' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Жарамсыз токен' });
  }
}

function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    next();
  };
}

module.exports = { auth, role };
