const API_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export function createMessageHandlers(socket, io) {
  socket.on('send_message', async (payload) => {
    const { chatId, content, type = 'text' } = payload || {};
    if (!chatId || content == null || content === '') return;

    const token = socket.token;
    if (!token) return;

    socket.join(`chat:${chatId}`);

    try {
      const res = await fetch(`${API_URL}/api/messages/chat/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: String(content).trim(), type }),
      });

      if (!res.ok) {
        const err = await res.text();
        socket.emit('message_error', { chatId, error: err || res.statusText });
        return;
      }

      const message = await res.json();
      io.to(`chat:${chatId}`).emit('new_message', message);
    } catch (err) {
      console.error('send_message FastAPI error:', err);
      socket.emit('message_error', { chatId, error: err.message || 'Request failed' });
    }
  });
}
