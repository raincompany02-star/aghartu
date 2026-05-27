const express = require('express');
const db = require('../db');
const { auth, role } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const today = () => new Date().toISOString().slice(0, 10);

router.post('/checkin', (req, res) => {
  const { lat, lon } = req.body;
  const date = today();
  const ex = db.attendance.today(req.user.id, date);
  if (ex?.check_in) return res.status(400).json({ error: 'Бүгін кірдіңіз' });
  const time = new Date().toISOString();
  db.attendance.checkin(req.user.id, date, time, lat, lon);
  res.json({ ok: true, time });
});

router.post('/checkout', (req, res) => {
  const { lat, lon } = req.body;
  const date = today();
  const ex = db.attendance.today(req.user.id, date);
  if (!ex?.check_in)  return res.status(400).json({ error: 'Алдымен кіру батырмасын басыңыз' });
  if (ex?.check_out)  return res.status(400).json({ error: 'Бүгін шықтыңыз' });
  const time = new Date().toISOString();
  db.attendance.checkout(req.user.id, date, time, lat, lon);
  res.json({ ok: true, time });
});

router.get('/today', (req, res) => {
  res.json(db.attendance.today(req.user.id, today()) || {});
});

router.get('/me', (req, res) => {
  res.json(db.attendance.forUser(req.user.id));
});

router.get('/all', role('manager','director'), (req, res) => {
  const date = req.query.date || today();
  const records = db.attendance.forDate(date);
  const allUsers = db.users.all();
  const uMap = Object.fromEntries(allUsers.map(u => [u.id, { name: `${u.first_name} ${u.last_name}`, role: u.role }]));
  const enriched = records.map(a => ({ ...a, ...uMap[a.user_id] }));
  res.json(enriched);
});

module.exports = router;
