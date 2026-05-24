const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/schema');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const AVATAR_COLORS = [
  '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
];

router.post('/register', (req, res) => {
  const { username, email } = req.body;
  if (!username?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Username and email required' });
  }

  const db = getDB();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

  if (user) {
    // Update username if it changed and re-login
    if (username.trim() !== user.username) {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '90d' });
    return res.json({ token, user: sanitize(user) });
  }

  // New user
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const id = uuidv4();
  db.prepare(
    'INSERT INTO users (id, username, email, avatar_color) VALUES (?, ?, ?, ?)'
  ).run(id, username.trim(), email.toLowerCase().trim(), color);

  user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '90d' });
  res.status(201).json({ token, user: sanitize(user) });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: sanitize(req.user) });
});

router.put('/me', authMiddleware, (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });
  const db = getDB();
  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: sanitize(user) });
});

function sanitize(user) {
  const { push_subscription, ...safe } = user;
  return safe;
}

module.exports = router;
