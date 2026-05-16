# syntax=docker/dockerfile:1.6
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY server.js ./
USER node
EXPOSE 8080
CMD ["node", "server.js"]
