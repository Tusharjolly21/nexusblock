FROM node:20-alpine
WORKDIR /app

# Install deps first for better layer caching.
COPY package.json ./
RUN npm install --omit=dev

COPY server.mjs ./

ENV PORT=1234
EXPOSE 1234

CMD ["node", "server.mjs"]
