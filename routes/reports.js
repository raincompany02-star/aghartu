const express = require('express');
const db = require('../db');
const { auth, role } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.post('/', (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Отчет жазыңыз' });
  const rep = db.reports.insert({
    user_id: req.user.id,
    date:    new Date().toISOString().slice(0, 10),
    content: content.trim()
  });
  res.json({ id: rep.id });
});

router.get('/me', (req, res) => {
  res.json(db.reports.forUser(req.user.id));
});

router.get('/all', role('manager','director'), (req, res) => {
  const { date } = req.query;
  const allUsers = db.users.all();
  const uMap = Object.fromEntries(allUsers.map(u => [u.id, `${u.first_name} ${u.last_name}`]));
  const reps = date ? db.reports.forDate(date) : db.reports.all().slice(-100);
  res.json(reps.reverse().map(r => ({ ...r, name: uMap[r.user_id] || '—' })));
});

module.exports = router;
