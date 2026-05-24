const webpush = require('web-push');
const { getDB } = require('../db/schema');

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    configured = true;
  }
}

async function sendPush(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  ensureConfigured();
  const db = getDB();
  const user = db.prepare('SELECT push_subscription FROM users WHERE id = ?').get(userId);
  if (!user?.push_subscription) return;
  try {
    const sub = JSON.parse(user.push_subscription);
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (e) {
    if (e.statusCode === 410) {
      db.prepare('UPDATE users SET push_subscription = NULL WHERE id = ?').run(userId);
    }
  }
}

async function sendGroupNotification(groupId, excludeUserId, payload) {
  const db = getDB();
  const members = db.prepare('SELECT user_id FROM group_members WHERE group_id = ?').all(groupId);
  const promises = members
    .filter(m => m.user_id !== excludeUserId)
    .map(m => sendPush(m.user_id, payload));
  await Promise.allSettled(promises);
}

module.exports = { sendPush, sendGroupNotification };
