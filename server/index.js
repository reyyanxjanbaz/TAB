require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { initDB } = require('./db/schema');
const sessionsRouter = require('./routes/sessions');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

initDB();

// Wire io into sessions router for real-time emission
sessionsRouter.setIO(io);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/sessions', sessionsRouter);
app.use('/api/push', require('./routes/push'));

require('./socket/handlers')(io);

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✓ TAB server running at http://localhost:${PORT}`);
});
