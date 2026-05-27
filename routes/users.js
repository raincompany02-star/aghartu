const express = require('express');
const db = require('../db');
const { auth, role } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/me', (req, res) => {
  const u = db.users.get(req.user.id);
  if (!u) return res.status(404).json({ error: 'Табылмады' });
  const { password_hash, ...safe } = u;
  res.json(safe);
});

router.get('/', role('manager','director'), (req, res) => {
  const users = db.users.all().map(({ password_hash, ...u }) => u);
  res.json(users.sort((a, b) => a.role.localeCompare(b.role)));
});

router.put('/:id/role', role('director'), (req, res) => {
  const { role: newRole } = req.body;
  if (!['employee','manager','director'].includes(newRole))
    return res.status(400).json({ error: 'Жарамсыз рөл' });
  db.users.setRole(Number(req.params.id), newRole);
  res.json({ ok: true });
});

module.exports = router;
