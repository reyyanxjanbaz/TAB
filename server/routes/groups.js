const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/schema');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Get my groups
router.get('/', (req, res) => {
  const db = getDB();
  const groups = db.prepare(`
    SELECT g.*, gm.role,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
      (SELECT COUNT(*) FROM order_sessions WHERE group_id = g.id) as session_count
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
    ORDER BY g.created_at DESC
  `).all(req.user.id);
  res.json({ groups });
});

// Create group
router.post('/', (req, res) => {
  const { name, icon_emoji } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });

  const db = getDB();
  let invite_code;
  do { invite_code = genCode(); }
  while (db.prepare('SELECT id FROM groups WHERE invite_code = ?').get(invite_code));

  const id = uuidv4();
  db.prepare(
    'INSERT INTO groups (id, name, icon_emoji, invite_code, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), icon_emoji || '🍔', invite_code, req.user.id);

  db.prepare(
    'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), id, req.user.id, 'admin');

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  res.status(201).json({ group });
});

// Join group by code
router.post('/join', (req, res) => {
  const { invite_code } = req.body;
  if (!invite_code?.trim()) return res.status(400).json({ error: 'Invite code required' });

  const db = getDB();
  const group = db.prepare('SELECT * FROM groups WHERE invite_code = ?').get(invite_code.trim().toUpperCase());
  if (!group) return res.status(404).json({ error: 'Invalid invite code' });

  const existing = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group.id, req.user.id);
  if (existing) return res.json({ group, already_member: true });

  db.prepare(
    'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), group.id, req.user.id, 'member');

  res.json({ group });
});

// Get group detail
router.get('/:id', (req, res) => {
  const db = getDB();
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a member' });

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const members = db.prepare(`
    SELECT u.id, u.username, u.email, u.avatar_color, gm.role, gm.joined_at
    FROM users u JOIN group_members gm ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY gm.joined_at ASC
  `).all(req.params.id);

  const sessions = db.prepare(`
    SELECT os.*, u.username as host_name
    FROM order_sessions os
    JOIN users u ON os.created_by = u.id
    WHERE os.group_id = ?
    ORDER BY os.created_at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({ group, members, sessions, my_role: member.role });
});

// Create order session
router.post('/:id/sessions', (req, res) => {
  const db = getDB();
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a member' });

  const id = uuidv4();
  db.prepare(
    'INSERT INTO order_sessions (id, group_id, created_by, status) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.id, req.user.id, 'setup');

  const session = db.prepare('SELECT * FROM order_sessions WHERE id = ?').get(id);
  res.status(201).json({ session });
});

module.exports = router;
