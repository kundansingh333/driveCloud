FROM node:18-alpine

# Install dependencies required for sharp
RUN apk add --no-cache python3 make g++ vips-dev wget

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create required directories
RUN mkdir -p uploads thumbnails

# Expose backend port
EXPOSE 5001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/health || exit 1

# Start application
CMD ["node", "server.js"]
