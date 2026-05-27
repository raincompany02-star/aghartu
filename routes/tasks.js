const express = require('express');
const db = require('../db');
const { auth, role } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const allUsers = await db.users.all();
    const uMap = Object.fromEntries(allUsers.map(u => [u.id, `${u.first_name} ${u.last_name}`]));
    let tasks = await db.tasks.all();
    if (req.user.role === 'employee') {
      tasks = tasks.filter(t => t.assigned_to === Number(req.user.id) || t.assigned_to === null);
    }
    const enriched = tasks.map(t => ({
      ...t,
      assigned_to_name: uMap[t.assigned_to] || null,
      created_by_name:  uMap[t.created_by]  || null
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  const { title, description, assigned_to, due_date, type } = req.body;
  if (!title) return res.status(400).json({ error: 'Takyrip engiziniz' });
  try {
    const task = await db.tasks.insert({
      title,
      description:  description || null,
      assigned_to:  assigned_to ? Number(assigned_to) : null,
      created_by:   req.user.id,
      due_date:     due_date || null,
      type:         type || 'daily'
    });
    res.json({ id: task.id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['todo','process','done'].includes(status))
    return res.status(400).json({ error: 'Zharamsy status' });
  try {
    await db.tasks.setStatus(Number(req.params.id), status);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', role('manager','director'), async (req, res) => {
  try {
    await db.tasks.del(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
