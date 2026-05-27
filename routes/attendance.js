const express = require('express');
const db = require('../db');
const { auth, role } = require('../middleware/auth');
const router = express.Router();
router.use(auth);
const today = () => new Date().toISOString().slice(0, 10);

router.post('/checkin', async (req, res) => {
  const { lat, lon } = req.body;
  const date = today();
  try {
    const ex = await db.attendance.today(req.user.id, date);
    if (ex && ex.check_in) return res.status(400).json({ error: 'Already checked in today' });
    const time = new Date().toISOString();
    await db.attendance.checkin(req.user.id, date, time, lat, lon);
    res.json({ ok: true, time });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/checkout', async (req, res) => {
  const { lat, lon } = req.body;
  const date = today();
  try {
    const ex = await db.attendance.today(req.user.id, date);
    if (!ex || !ex.check_in) return res.status(400).json({ error: 'Check in first' });
    if (ex.check_out) return res.status(400).json({ error: 'Already checked out' });
    const time = new Date().toISOString();
    await db.attendance.checkout(req.user.id, date, time, lat, lon);
    res.json({ ok: true, time });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/today', async (req, res) => {
  try { res.json((await db.attendance.today(req.user.id, today())) || {}); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', async (req, res) => {
  try { res.json(await db.attendance.forUser(req.user.id)); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/all', role('manager','director'), async (req, res) => {
  try {
    const date = req.query.date || today();
    const records = await db.attendance.forDate(date);
    const allUsers = await db.users.all();
    const uMap = Object.fromEntries(allUsers.map(u => [u.id, { name: `${u.first_name} ${u.last_name}`, role: u.role }]));
    res.json(records.map(a => ({ ...a, ...uMap[a.user_id] })));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
