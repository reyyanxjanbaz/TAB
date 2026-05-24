const express = require('express');
const { getDB } = require('../db/schema');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Subscription required' });
  const db = getDB();
  db.prepare('UPDATE users SET push_subscription = ? WHERE id = ?').run(
    JSON.stringify(subscription), req.user.id
  );
  res.json({ ok: true });
});

router.delete('/subscribe', (req, res) => {
  const db = getDB();
  db.prepare('UPDATE users SET push_subscription = NULL WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

module.exports = router;
