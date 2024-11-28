const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: IOServer } = require('socket.io');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Socket.IO 서버 초기화
  const io = new IOServer(server, {
    path: '/api/socket_io',
    addTrailingSlash: false,
  });

  // 글로벌 객체에 소켓 서버 인스턴스 저장
  global.__socketServer = io;

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // 클라이언트가 보낸 CRDT 연산을 모든 다른 클라이언트에 브로드캐스트
    socket.on('crdt-op', (op) => {
      socket.broadcast.emit('crdt-op', op);
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
    console.log('> Socket.IO server initialized');
  });
}); 