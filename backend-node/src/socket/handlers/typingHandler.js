import { CHANNELS, publishMessage, subscribeToChannel } from '../../redis/pubsub.js';

export function registerTypingHandler(io) {
  subscribeToChannel(CHANNELS.TYPING, (data) => {
    const { chatId, userId, username, isTyping } = data;
    io.to(`chat:${chatId}`).emit('typing', { userId, username, isTyping });
  });
}

export function createTypingHandlers(socket, io) {
  socket.on('typing:start', async (payload) => {
    const { chatId } = payload;
    if (!chatId || !socket.userId) return;
    await publishMessage(CHANNELS.TYPING, {
      chatId,
      userId: socket.userId,
      username: socket.username || 'User',
      isTyping: true,
    });
  });

  socket.on('typing:stop', async (payload) => {
    const { chatId } = payload;
    if (!chatId || !socket.userId) return;
    await publishMessage(CHANNELS.TYPING, {
      chatId,
      userId: socket.userId,
      username: socket.username || 'User',
      isTyping: false,
    });
  });
}
