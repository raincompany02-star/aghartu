const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const router  = express.Router();
const SECRET  = process.env.JWT_SECRET || 'aghartu-2026';
const PHONE_RE = /^\+?[0-9]{10,13}$/;

router.post('/register', async (req, res) => {
  const { first_name, last_name, phone, password, role } = req.body;
  if (!first_name || !last_name || !phone || !password)
    return res.status(400).json({ error: 'Барлық өрістерді толтырыңыз' });
  if (!PHONE_RE.test(phone))
    return res.status(400).json({ error: 'Телефон нөмірі дұрыс емес' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Пароль кемінде 6 таңба' });
  try {
    const r = ['employee','manager','director'].includes(role) ? role : 'employee';
    const hash = await bcrypt.hash(password, 10);
    const user = db.users.insert({ first_name, last_name, phone, password_hash: hash, role: r });
    const token = jwt.sign({ id: user.id, role: r }, SECRET, { expiresIn: '30d' });
    res.json({ token, role: r, name: `${first_name} ${last_name}` });
  } catch (e) {
    if (e.code === 'UNIQUE') return res.status(400).json({ error: 'Бұл нөмір тіркелген' });
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    return res.status(400).json({ error: 'Нөмір мен пароль енгізіңіз' });
  const user = db.users.byPhone(phone);
  if (!user) return res.status(401).json({ error: 'Пайдаланушы табылмады' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Пароль қате' });
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '30d' });
  res.json({ token, role: user.role, name: `${user.first_name} ${user.last_name}` });
});

module.exports = router;
