FROM node:18-alpine

# Install build tools for native dependencies (sharp)
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create upload and thumbnail directories
RUN mkdir -p uploads thumbnails

EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/health || exit 1

CMD ["node", "server.js"]
