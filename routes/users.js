const express = require('express');
const db = require('../db');
const { auth, role } = require('../middleware/auth');
const router = express.Router();
router.use(auth);

router.get('/me', async (req, res) => {
  try {
    const u = await db.users.get(req.user.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    const { password_hash, ...safe } = u;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/', role('manager','director'), async (req, res) => {
  try {
    const users = (await db.users.all()).map(({ password_hash, ...u }) => u);
    res.json(users.sort((a, b) => a.role.localeCompare(b.role)));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/role', role('director'), async (req, res) => {
  const { role: newRole } = req.body;
  if (!['employee','manager','director'].includes(newRole))
    return res.status(400).json({ error: 'Invalid role' });
  try {
    await db.users.setRole(Number(req.params.id), newRole);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
