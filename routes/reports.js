const express = require('express');
const db = require('../db');
const { auth, role } = require('../middleware/auth');
const router = express.Router();
router.use(auth);

router.post('/', async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Write report' });
  try {
    const rep = await db.reports.insert({ user_id: req.user.id, date: new Date().toISOString().slice(0,10), content: content.trim() });
    res.json({ id: rep.id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', async (req, res) => {
  try { res.json(await db.reports.forUser(req.user.id)); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/all', role('manager','director'), async (req, res) => {
  try {
    const { date } = req.query;
    const allUsers = await db.users.all();
    const uMap = Object.fromEntries(allUsers.map(u => [u.id, `${u.first_name} ${u.last_name}`]));
    const reps = date ? await db.reports.forDate(date) : (await db.reports.all()).slice(0,100);
    res.json(reps.map(r => ({ ...r, name: uMap[r.user_id] || '-' })));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
