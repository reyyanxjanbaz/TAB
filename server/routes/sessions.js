const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/schema');
const authMiddleware = require('../middleware/auth');
const { sendGroupNotification } = require('../services/push');

const router = express.Router();
router.use(authMiddleware);

// Store io reference (set from index.js)
let _io;
router.setIO = (io) => { _io = io; };

function getSessionWithAccess(sessionId, userId) {
  const db = getDB();
  const session = db.prepare('SELECT * FROM order_sessions WHERE id = ?').get(sessionId);
  if (!session) return null;
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(session.group_id, userId);
  if (!member) return null;
  return { session, member };
}

function buildSummary(sessionId) {
  const db = getDB();
  const session = db.prepare('SELECT * FROM order_sessions WHERE id = ?').get(sessionId);
  const items = db.prepare('SELECT * FROM session_items WHERE session_id = ? ORDER BY sort_order').all(sessionId);
  const responses = db.prepare(`
    SELECT ur.*, u.username, u.avatar_color
    FROM user_responses ur
    JOIN users u ON ur.user_id = u.id
    WHERE ur.session_id = ?
  `).all(sessionId);

  const responsesWithItems = responses.map(r => {
    const ritems = db.prepare(`
      SELECT ri.quantity, si.name, si.price, si.id as item_id
      FROM response_items ri
      JOIN session_items si ON ri.item_id = si.id
      WHERE ri.response_id = ?
    `).all(r.id);
    return { ...r, items: ritems };
  });

  // Aggregate totals per item
  const itemTotals = items.map(item => {
    const orders = responsesWithItems
      .filter(r => r.status === 'responded')
      .flatMap(r => r.items.filter(i => i.item_id === item.id))
      .reduce((sum, i) => sum + i.quantity, 0);
    return { ...item, total_qty: orders };
  }).filter(i => i.total_qty > 0);

  const declined = responsesWithItems.filter(r => r.status === 'declined');
  const pending = responses.filter(r => r.status === 'pending').length;

  return { session, items, responses: responsesWithItems, itemTotals, declined, pending };
}

// Get session detail
router.get('/:id', (req, res) => {
  const result = getSessionWithAccess(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Session not found' });
  const { session } = result;

  const db = getDB();
  const items = db.prepare('SELECT * FROM session_items WHERE session_id = ? ORDER BY sort_order').all(session.id);
  const myResponse = db.prepare('SELECT * FROM user_responses WHERE session_id = ? AND user_id = ?').get(session.id, req.user.id);
  let myResponseItems = [];
  if (myResponse) {
    myResponseItems = db.prepare(`
      SELECT ri.*, si.name, si.price FROM response_items ri
      JOIN session_items si ON ri.item_id = si.id
      WHERE ri.response_id = ?
    `).all(myResponse.id);
  }

  const responses = db.prepare(`
    SELECT ur.id, ur.status, ur.responded_at, u.id as user_id, u.username, u.avatar_color
    FROM user_responses ur JOIN users u ON ur.user_id = u.id
    WHERE ur.session_id = ?
  `).all(session.id);

  const host = db.prepare('SELECT id, username, avatar_color FROM users WHERE id = ?').get(session.created_by);
  res.json({ session, items, myResponse: myResponse ? { ...myResponse, items: myResponseItems } : null, responses, host });
});

// Get session summary
router.get('/:id/summary', (req, res) => {
  const result = getSessionWithAccess(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(buildSummary(req.params.id));
});

// Add item
router.post('/:id/items', (req, res) => {
  const result = getSessionWithAccess(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Session not found' });
  const { session } = result;
  if (session.status !== 'setup') return res.status(400).json({ error: 'Session already started' });
  if (session.created_by !== req.user.id) return res.status(403).json({ error: 'Only host can add items' });

  const { name, price } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Item name required' });

  const db = getDB();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM session_items WHERE session_id = ?').get(session.id);
  const id = uuidv4();
  db.prepare('INSERT INTO session_items (id, session_id, name, price, sort_order) VALUES (?, ?, ?, ?, ?)').run(
    id, session.id, name.trim(), price || null, (maxOrder.m || 0) + 1
  );
  const item = db.prepare('SELECT * FROM session_items WHERE id = ?').get(id);
  if (_io) _io.to(`session:${session.id}`).emit('session:item-added', { item });
  res.status(201).json({ item });
});

// Update item
router.put('/:id/items/:itemId', (req, res) => {
  const result = getSessionWithAccess(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Session not found' });
  const { session } = result;
  if (session.status !== 'setup') return res.status(400).json({ error: 'Session already started' });
  if (session.created_by !== req.user.id) return res.status(403).json({ error: 'Only host can edit items' });

  const { name, price } = req.body;
  const db = getDB();
  db.prepare('UPDATE session_items SET name = ?, price = ? WHERE id = ? AND session_id = ?').run(
    name?.trim(), price || null, req.params.itemId, session.id
  );
  const item = db.prepare('SELECT * FROM session_items WHERE id = ?').get(req.params.itemId);
  if (_io) _io.to(`session:${session.id}`).emit('session:item-updated', { item });
  res.json({ item });
});

// Delete item
router.delete('/:id/items/:itemId', (req, res) => {
  const result = getSessionWithAccess(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Session not found' });
  const { session } = result;
  if (session.created_by !== req.user.id) return res.status(403).json({ error: 'Only host can remove items' });
  const db = getDB();
  db.prepare('DELETE FROM session_items WHERE id = ? AND session_id = ?').run(req.params.itemId, session.id);
  if (_io) _io.to(`session:${session.id}`).emit('session:item-removed', { itemId: req.params.itemId });
  res.json({ ok: true });
});

// Start session
router.post('/:id/start', async (req, res) => {
  const result = getSessionWithAccess(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Session not found' });
  const { session } = result;
  if (session.status !== 'setup') return res.status(400).json({ error: 'Already started' });
  if (session.created_by !== req.user.id) return res.status(403).json({ error: 'Only host can start' });

  const { timer_duration } = req.body; // seconds
  const db = getDB();
  const items = db.prepare('SELECT * FROM session_items WHERE session_id = ?').all(session.id);
  if (!items.length) return res.status(400).json({ error: 'Add at least one item' });

  const ends_at = timer_duration ? new Date(Date.now() + timer_duration * 1000).toISOString() : null;
  db.prepare('UPDATE order_sessions SET status = ?, timer_duration = ?, ends_at = ? WHERE id = ?').run(
    'active', timer_duration || null, ends_at, session.id
  );

  // Create pending responses for all members
  const members = db.prepare('SELECT user_id FROM group_members WHERE group_id = ?').all(session.group_id);
  const insertResponse = db.prepare('INSERT OR IGNORE INTO user_responses (id, session_id, user_id, status) VALUES (?, ?, ?, ?)');
  for (const m of members) {
    insertResponse.run(uuidv4(), session.id, m.user_id, 'pending');
  }

  const updated = db.prepare('SELECT * FROM order_sessions WHERE id = ?').get(session.id);
  if (_io) _io.to(`group:${session.group_id}`).emit('session:started', { session: updated });

  // Push notifications
  try {
    await sendGroupNotification(session.group_id, req.user.id, {
      title: 'TAB — Order started! 🍔',
      body: `${req.user.username} started a new order`,
      data: { sessionId: session.id, groupId: session.group_id },
    });
  } catch (e) { /* push is best-effort */ }

  res.json({ session: updated });

  // Auto-close when timer expires
  if (timer_duration) {
    setTimeout(async () => {
      const s = db.prepare('SELECT * FROM order_sessions WHERE id = ?').get(session.id);
      if (s?.status === 'active') {
        db.prepare('UPDATE order_sessions SET status = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?').run('closed', session.id);
        if (_io) _io.to(`group:${session.group_id}`).emit('session:closed', { sessionId: session.id });
        try {
          await sendGroupNotification(session.group_id, null, {
            title: 'TAB — Order closed!',
            body: 'The order has been finalized. Check the summary.',
            data: { sessionId: session.id, groupId: session.group_id },
          });
        } catch (e) { /* */ }
      }
    }, timer_duration * 1000);
  }
});

// Submit / update response
router.post('/:id/respond', (req, res) => {
  const result = getSessionWithAccess(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Session not found' });
  const { session } = result;
  if (session.status !== 'active') return res.status(400).json({ error: 'Session not active' });

  const { declined, items, notes } = req.body;
  // items: [{ item_id, quantity }]
  const db = getDB();

  let response = db.prepare('SELECT * FROM user_responses WHERE session_id = ? AND user_id = ?').get(session.id, req.user.id);
  const responseId = response?.id || uuidv4();

  if (!response) {
    db.prepare('INSERT INTO user_responses (id, session_id, user_id, status) VALUES (?, ?, ?, ?)').run(responseId, session.id, req.user.id, 'pending');
  }

  const status = declined ? 'declined' : 'responded';
  db.prepare('UPDATE user_responses SET status = ?, notes = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, notes || null, responseId);

  // Clear old response items
  db.prepare('DELETE FROM response_items WHERE response_id = ?').run(responseId);

  if (!declined && items?.length) {
    const insert = db.prepare('INSERT INTO response_items (id, response_id, item_id, quantity) VALUES (?, ?, ?, ?)');
    for (const i of items) {
      if (i.quantity > 0) insert.run(uuidv4(), responseId, i.item_id, i.quantity);
    }
  }

  response = db.prepare('SELECT * FROM user_responses WHERE id = ?').get(responseId);
  const responseItems = db.prepare('SELECT ri.*, si.name FROM response_items ri JOIN session_items si ON ri.item_id = si.id WHERE ri.response_id = ?').all(responseId);

  if (_io) {
    _io.to(`session:${session.id}`).emit('session:response-updated', {
      response: { ...response, items: responseItems, username: req.user.username, avatar_color: req.user.avatar_color },
    });
  }
  res.json({ response: { ...response, items: responseItems } });
});

// Close session manually
router.post('/:id/close', async (req, res) => {
  const result = getSessionWithAccess(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Session not found' });
  const { session } = result;
  if (session.created_by !== req.user.id) return res.status(403).json({ error: 'Only host can close' });
  if (session.status === 'closed') return res.status(400).json({ error: 'Already closed' });

  const db = getDB();
  db.prepare('UPDATE order_sessions SET status = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?').run('closed', session.id);
  if (_io) _io.to(`group:${session.group_id}`).emit('session:closed', { sessionId: session.id });

  try {
    await sendGroupNotification(session.group_id, null, {
      title: 'TAB — Order closed!',
      body: 'Check the order summary.',
      data: { sessionId: session.id, groupId: session.group_id },
    });
  } catch (e) { /* */ }

  res.json({ ok: true });
});

module.exports = router;
