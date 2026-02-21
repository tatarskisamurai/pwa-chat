import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createMessageHandlers } from './handlers/messageHandler.js';
import { registerTypingHandler, createTypingHandlers } from './handlers/typingHandler.js';
import { registerPresenceHandler, createPresenceHandlers } from './handlers/presenceHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

function authMiddleware(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.sub || decoded.user_id;
    socket.username = decoded.username;
    socket.token = token;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io/',
  });

  io.use(authMiddleware);

  registerTypingHandler(io);
  registerPresenceHandler(io);

  io.on('connection', (socket) => {
    socket.on('join_chat', (chatId) => {
      if (chatId) socket.join(`chat:${chatId}`);
    });
    socket.on('leave_chat', (chatId) => {
      if (chatId) socket.leave(`chat:${chatId}`);
    });

    createMessageHandlers(socket, io);
    createTypingHandlers(socket, io);
    createPresenceHandlers(socket, io);
  });

  return io;
}
