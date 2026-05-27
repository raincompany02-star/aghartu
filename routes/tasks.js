const express = require('express');
const db = require('../db');
const { auth, role } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', (req, res) => {
  const allUsers = db.users.all();
  const uMap = Object.fromEntries(allUsers.map(u => [u.id, `${u.first_name} ${u.last_name}`]));
  let tasks = db.tasks.all();
  if (req.user.role === 'employee') {
    tasks = tasks.filter(t => t.assigned_to === req.user.id);
  }
  const enriched = tasks.map(t => ({
    ...t,
    assigned_to_name: uMap[t.assigned_to] || null,
    created_by_name:  uMap[t.created_by]  || null
  }));
  res.json(enriched.reverse());
});

router.post('/', (req, res) => {
  const { title, description, assigned_to, due_date, type } = req.body;
  if (!title) return res.status(400).json({ error: 'Тақырып енгізіңіз' });
  const task = db.tasks.insert({
    title,
    description:  description || null,
    assigned_to:  assigned_to ? Number(assigned_to) : req.user.id,
    created_by:   req.user.id,
    due_date:     due_date || null,
    type:         type || 'daily'
  });
  res.json({ id: task.id });
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['todo','process','done'].includes(status))
    return res.status(400).json({ error: 'Жарамсыз статус' });
  db.tasks.setStatus(Number(req.params.id), status);
  res.json({ ok: true });
});

router.delete('/:id', role('manager','director'), (req, res) => {
  db.tasks.del(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
