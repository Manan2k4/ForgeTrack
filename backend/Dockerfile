FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production

# The app reads PORT from the environment; platforms like Koyeb/Railway set it.
EXPOSE 5000

CMD ["node", "server.js"]
