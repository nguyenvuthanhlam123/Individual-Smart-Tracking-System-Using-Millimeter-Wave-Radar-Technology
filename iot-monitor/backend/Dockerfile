# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY ./src ./src
COPY ./config ./config
EXPOSE 3000
CMD [ "node", "src/server.js" ]
