# TAB — Group Orders, Made Effortless

A mobile-first Progressive Web App for coordinating group food orders without the chat chaos.

## Quick Start

```bash
# 1. Setup (generates .env + VAPID keys)
npm run setup

# 2. Install all dependencies
npm run install:all

# 3. Start dev servers (client on :5173, server on :3001)
npm run dev
```

Open http://localhost:5173 on your phone or browser.

## Features

- **Groups** — Create/join with a 6-char invite code or share link
- **Live Orders** — Real-time item selection with socket.io
- **Timer** — Auto-closes orders at 1/5/10 min or custom duration  
- **Push Notifications** — Notifies the group when an order starts/closes
- **Order Summary** — Shareable breakdown of who ordered what
- **Order History** — Browse past sessions per group
- **PWA** — Installable on iOS/Android, works offline for cached pages

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express + Socket.io |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (90-day tokens, no passwords) |
| Push | Web Push API + VAPID |
| PWA | Custom service worker |

## Project Structure

```
TAB/
├── client/          # React frontend
│   ├── public/      # manifest.json, sw.js, icons/
│   └── src/
│       ├── pages/   # Welcome, Home, GroupDetail, OrderSetup, ActiveOrder, OrderSummary
│       ├── components/
│       ├── contexts/ # AuthContext, SocketContext
│       └── lib/     # api.js, utils.js, push.js
├── server/          # Express backend
│   ├── db/          # SQLite schema
│   ├── routes/      # auth, groups, sessions, push
│   ├── socket/      # Socket.io handlers
│   └── services/    # push notifications
├── data/            # SQLite database (auto-created)
└── scripts/         # setup, generate-icons
```

## Deploy to Production

1. `cd client && npm run build` — outputs to `client/dist/`
2. Set `NODE_ENV=production` on server
3. Server serves the built client statically
4. Use a reverse proxy (nginx/Caddy) with HTTPS for push notifications

## PWA Icons

Replace `client/public/icons/icon-192.png` and `icon-512.png` with real PNGs.  
Use the generated SVGs as a reference, or https://realfavicongenerator.net.
