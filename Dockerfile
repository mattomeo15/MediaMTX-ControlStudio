# Multi-stage production build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy configuration and source files
COPY tsconfig.json vite.config.ts server.ts ./
COPY src/ ./src/
COPY server/ ./server/

# Build client SPA and compile backend server to dist/server.cjs
RUN npm run build

# --- Production stage ---
FROM node:20-alpine

# Install FFmpeg for stream compiling and image reel looping
RUN apk add --no-cache ffmpeg

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

# Create persistent data volume directories
RUN mkdir -p /app/data/announcements/images

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
