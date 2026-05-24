const jwt = require('jsonwebtoken');
const { getDB } = require('../db/schema');

module.exports = function (io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const db = getDB();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join a group room to get session started/closed events
    socket.on('join-group', (groupId) => {
      const db = getDB();
      const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, socket.user.id);
      if (member) socket.join(`group:${groupId}`);
    });

    // Join a session room for real-time updates
    socket.on('join-session', (sessionId) => {
      const db = getDB();
      const session = db.prepare('SELECT * FROM order_sessions WHERE id = ?').get(sessionId);
      if (!session) return;
      const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(session.group_id, socket.user.id);
      if (member) socket.join(`session:${sessionId}`);
    });

    socket.on('leave-session', (sessionId) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('disconnect', () => {});
  });
};
