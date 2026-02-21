FROM node:20-alpine AS builder
WORKDIR /app
ENV NPM_CONFIG_LOGLEVEL=info NPM_CONFIG_FETCH_TIMEOUT=120000 CI=1
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund
COPY . .
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Порядок важен: map в http-контексте (01-… подключается раньше default.conf)
COPY nginx-upgrade-map.conf /etc/nginx/conf.d/01-upgrade-map.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
