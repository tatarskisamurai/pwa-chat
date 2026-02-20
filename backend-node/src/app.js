import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { initSocket } from './socket/socket.js';

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'chat-ws' });
});

initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
