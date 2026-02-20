import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';

export const pub = new Redis(redisUrl);
export const sub = new Redis(redisUrl);

const CHANNELS = {
  MESSAGE: 'chat:message',
  TYPING: 'chat:typing',
  PRESENCE: 'chat:presence',
};

export function subscribeToChannel(channel, handler) {
  sub.subscribe(channel, (err, count) => {
    if (err) console.error('Redis subscribe error:', err);
  });
  sub.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        handler(JSON.parse(message));
      } catch (e) {
        console.error('PubSub parse error:', e);
      }
    }
  });
}

export async function publishMessage(channel, payload) {
  await pub.publish(channel, JSON.stringify(payload));
}

export { CHANNELS };
