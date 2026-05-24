// Uses Node.js built-in sqlite (requires Node 22.5+, included in Node 24)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'tab.db');

let db;

function getDB() {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar_color TEXT DEFAULT '#FF6B35',
      push_subscription TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon_emoji TEXT DEFAULT '🍔',
      invite_code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS order_sessions (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      status TEXT DEFAULT 'setup',
      timer_duration INTEGER,
      ends_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS session_items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES order_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_responses (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      responded_at DATETIME,
      FOREIGN KEY (session_id) REFERENCES order_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(session_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS response_items (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (response_id) REFERENCES user_responses(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES session_items(id)
    );
  `);
  console.log('✓ Database ready');
}

module.exports = { getDB, initDB };
