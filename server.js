// server.js — Socket.IO relay (Render)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: '/socket.io',
  cors: { origin: '*', methods: ['GET','POST'] },
  serveClient: true
});

// Health route
app.get('/', (req,res)=> res.send('Socket.IO relay is alive'));

io.on('connection', (socket)=>{
  // client gọi join-room
  socket.on('join-room', ({ room, role }, ack)=>{
    if (room) socket.join(room);
    // báo cho cả phòng là đã có người vào
    io.to(room).emit('room-joined', { room, who: role || 'guest' });
    if (typeof ack === 'function') ack({ ok: true });
  });

  // guest intent -> relay cho host (và cả phòng cho đơn giản)
  socket.on('client-message', ({ room, type, payload })=>{
    if (!room) return;
    io.to(room).emit('client-message', { room, type, payload });
  });

  // host broadcast state authoritative
  socket.on('host-broadcast', ({ room, state })=>{
    if (!room) return;
    io.to(room).emit('host-broadcast', { room, state });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Socket.IO relay listening on', PORT));
