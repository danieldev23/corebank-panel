# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build-stage

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies (including dev for building Vite frontend)
RUN npm install

# Copy source code
COPY . .

# Build the Vue frontend
RUN npm run build

# ─── Production Stage ────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS production-stage

WORKDIR /app

# Install native dependencies needed for 'sharp' and 'onnxruntime-node'
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package info
COPY package*.json ./

# Install only production dependencies to keep the image small
RUN npm install --omit=dev

# Copy backend files and shared types
COPY server/ ./server/

# Copy the built frontend static files from the build stage
COPY --from=build-stage /app/dist ./dist

# Create internal data directory for Settings persistence
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data

# Environment settings
ENV PORT=2001
ENV NODE_ENV=production

# Expose the application port
EXPOSE 2001

# Run as non-root user
USER node

# Start the application
CMD ["npx", "tsx", "server/index.ts"]
