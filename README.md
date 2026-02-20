# Мессенджер PWA

PWA-мессенджер с личными и групповыми чатами, real-time через WebSocket, REST API на FastAPI и Node.js для сокетов.

## Стек

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, React Query, Zustand, React Router v6, Socket.io-client
- **Backend REST:** FastAPI, SQLAlchemy (async), Pydantic, JWT, PostgreSQL
- **Backend Real-time:** Node.js, Socket.io, Redis (pub/sub)
- **Инфраструктура:** Docker Compose, Nginx, PostgreSQL, Redis

## Быстрый старт

### Локально (без Docker)

1. **PostgreSQL и Redis** должны быть запущены (например, через Docker только для БД и Redis):

```bash
cd infrastructure
docker compose up -d postgres redis
```

2. **Backend FastAPI:**

```bash
cd backend-fastapi
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. **Backend Node (WebSocket):**

```bash
cd backend-node
cp .env.example .env
npm install
npm run dev
```

4. **Frontend:**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Откройте http://localhost:5173 — прокси к API и сокетам уже настроен в Vite.

### Всё в Docker

Из корня проекта (папка `chat`):

```bash
cd infrastructure
docker compose up -d
```

- Frontend: http://localhost:5173  
- API: http://localhost:8000  
- WebSocket: http://localhost:3001  

Для production-сборки с Nginx:

```bash
docker compose --profile production up -d
```

## Переменные окружения

- **backend-fastapi/.env:** `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- **backend-node/.env:** `PORT`, `REDIS_URL`, `JWT_SECRET`
- **frontend/.env:** `VITE_API_URL`, `VITE_WS_URL`

## Функционал

- Регистрация и вход (JWT)
- Список чатов, выбор чата
- Отправка и получение сообщений (REST + real-time через Socket.io)
- Статус «печатает» и онлайн/офлайн (через сокеты)
- PWA: manifest, Service Worker, кэш, подготовка к push-уведомлениям

## Структура

```
chat/
├── infrastructure/     # docker-compose, nginx, postgres init, redis
├── backend-fastapi/    # REST API (auth, users, chats, messages)
├── backend-node/       # Socket.io, Redis pub/sub
├── frontend/           # React + TypeScript PWA
└── README.md
```

Дальше по плану: загрузка файлов (MinIO/S3), поиск по сообщениям, эмодзи/реакции, тесты.
