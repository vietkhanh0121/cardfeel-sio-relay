const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const ORIGINS = (process.env.CORS_ORIGINS || '*')
  .split(',').map(s => s.trim()).filter(Boolean);

const app = express();
app.use(cors({ origin: ORIGINS.length===1 && ORIGINS[0]==='*' ? '*' : ORIGINS, credentials: true }));
app.get('/', (_, res) => res.send('Socket.IO P2P Relay OK'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGINS.length===1 && ORIGINS[0]==='*' ? '*' : ORIGINS, methods: ['GET','POST'] },
  path: '/socket.io',
  pingInterval: 25000,
  pingTimeout: 60000,
});

const nsp = io.of('/p2p');
const roomsMeta = new Map();

nsp.on('connection', (socket) => {
  socket.on('join', ({ room, role }) => {
    if (!room) return;
    socket.data.role = role || 'guest';
    socket.join(room);

    let meta = roomsMeta.get(room);
    if (!meta) meta = { createdAt: Date.now(), members: new Set() };
    meta.members.add(socket.id);
    roomsMeta.set(room, meta);

    const count = nsp.adapter.rooms.get(room)?.size || 0;
    nsp.to(room).emit('room_info', { room, count });
    socket.emit('joined', { room, you: socket.id, role: socket.data.role });
  });

  socket.on('msg', (msg) => {
    const room = msg?.room;
    if (!room) return;
    socket.to(room).emit('msg', msg);
  });

  socket.on('leave', ({ room }) => {
    if (!room) return;
    socket.leave(room);
    const meta = roomsMeta.get(room);
    if (meta) {
      meta.members.delete(socket.id);
      if (meta.members.size === 0) roomsMeta.delete(room);
    }
  });

  socket.on('disconnect', () => {
    for (const [room, meta] of roomsMeta) {
      if (meta.members.has(socket.id)) {
        meta.members.delete(socket.id);
        if (meta.members.size === 0) roomsMeta.delete(room);
        nsp.to(room).emit('room_info', { room, count: meta.members.size });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log('Socket.IO relay listening on', PORT);
});