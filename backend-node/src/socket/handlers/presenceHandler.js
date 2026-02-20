import { CHANNELS, publishMessage, subscribeToChannel } from '../../redis/pubsub.js';

export function registerPresenceHandler(io) {
  subscribeToChannel(CHANNELS.PRESENCE, (data) => {
    const { userId, status, chatIds } = data;
    (chatIds || []).forEach((chatId) => {
      io.to(`chat:${chatId}`).emit('presence', { userId, status });
    });
  });
}

export function createPresenceHandlers(socket, io) {
  const setOnline = (chatIds, status = 'online') => {
    if (!socket.userId) return;
    publishMessage(CHANNELS.PRESENCE, {
      userId: socket.userId,
      status,
      chatIds: chatIds || [],
    });
  };

  socket.on('presence:online', (payload) => {
    const chatIds = payload?.chatIds || [];
    setOnline(chatIds, 'online');
  });

  socket.on('presence:offline', (payload) => {
    const chatIds = payload?.chatIds || [];
    setOnline(chatIds, 'offline');
  });

  socket.on('disconnect', () => {
    const chatIds = Array.from(socket.rooms)
      .filter((r) => r.startsWith('chat:'))
      .map((r) => r.replace('chat:', ''));
    setOnline(chatIds, 'offline');
  });
}
