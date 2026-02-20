import { CHANNELS, publishMessage, subscribeToChannel } from '../../redis/pubsub.js';

export function registerMessageHandler(io) {
  subscribeToChannel(CHANNELS.MESSAGE, (data) => {
    const { chatId, message } = data;
    io.to(`chat:${chatId}`).emit('message:new', message);
  });
}

export function createMessageHandlers(socket, io) {
  socket.on('message:send', async (payload) => {
    const { chatId, content, type = 'text', tempId } = payload;
    if (!chatId || !content) return;
    await publishMessage(CHANNELS.MESSAGE, {
      chatId,
      message: {
        tempId,
        chatId,
        content,
        type,
        userId: socket.userId,
        createdAt: new Date().toISOString(),
      },
    });
  });
}
