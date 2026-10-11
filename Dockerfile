FROM node:22-slim

WORKDIR /app

# Root: skip devDependencies (electron/electron-builder — not needed on Railway)
COPY package*.json ./
COPY ui/package*.json ./ui/

# Install root (omit dev) and UI deps separately to avoid esbuild ETXTBSY overlayfs conflict
RUN npm ci --omit=dev && npm --prefix ui ci

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run ui:build

# Runtime environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4010
ENV STATIC_DIR=/app/ui/dist

EXPOSE 4010

# Healthcheck for Railway
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "src/server.mjs"]
