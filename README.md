# Мессенджер PWA

PWA-мессенджер с личными и групповыми чатами, real-time через WebSocket на FastAPI, REST API на FastAPI.

## Стек

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, React Query, Zustand, React Router v6, нативный WebSocket
- **Backend:** FastAPI, SQLAlchemy (async), Pydantic, JWT, PostgreSQL; WebSocket на FastAPI (`/api/ws`)
- **Инфраструктура:** Docker Compose, Nginx, PostgreSQL

## Быстрый старт

### Локально (без Docker)

1. **PostgreSQL** должен быть запущен (например, через Docker):

```bash
cd infrastructure
docker compose up -d postgres
```

2. **Backend FastAPI:**

```bash
cd backend-fastapi
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. **Frontend:**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Откройте http://localhost:5173 — прокси к API (и WebSocket `/api/ws`) настроен в Vite.

### Всё в Docker

Из корня проекта (папка `chat`):

```bash
cd infrastructure
docker compose up -d
```

- Frontend: http://localhost:5173  
- API и WebSocket: http://localhost:8000 (REST `/api/*`, WebSocket `/api/ws`)

Для production-сборки с Nginx:

```bash
docker compose --profile production up -d
```

## Переменные окружения

- **backend-fastapi/.env:** `DATABASE_URL`, `JWT_SECRET`
- **frontend/.env:** `VITE_API_URL`

## Функционал

- Регистрация и вход (JWT)
- Список чатов, выбор чата
- Отправка и получение сообщений (REST + real-time через WebSocket на FastAPI)
- Статус «печатает» и онлайн/офлайн (через сокеты)
- PWA: manifest, Service Worker, кэш, подготовка к push-уведомлениям

## Структура

```
chat/
├── infrastructure/     # docker-compose, nginx, postgres init
├── backend-fastapi/   # REST API + WebSocket (auth, users, chats, messages)
├── frontend/           # React + TypeScript PWA
└── README.md
```

Дальше по плану: загрузка файлов (MinIO/S3), поиск по сообщениям, эмодзи/реакции, тесты.
