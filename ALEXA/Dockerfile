# Build context: ALEXA/ folder
FROM node:22-alpine

WORKDIR /app

# Install production dependencies first for better layer caching
COPY lambda/package.json lambda/package-lock.json ./
RUN npm install --omit=dev

# Copy skill source (tests and dev files excluded via .dockerignore)
COPY lambda/ ./

ENV PORT=4021
EXPOSE 4021

CMD ["node", "server.js"]
