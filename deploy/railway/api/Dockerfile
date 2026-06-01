FROM node:22-slim

WORKDIR /app

# Install system dependencies needed for native modules (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

ARG SQUIDWEAVE_REPO=https://github.com/knol3j/squidweave.git
ARG SQUIDWEAVE_REF=master

ADD https://api.github.com/repos/knol3j/squidweave/commits/master /tmp/squidweave-version.json
RUN git clone --depth 1 --branch "$SQUIDWEAVE_REF" "$SQUIDWEAVE_REPO" /app

# Root: skip devDependencies (electron/electron-builder — not needed on Railway)
RUN npm ci --omit=dev

# UI: install everything including devDeps (needed for vite build)
# (separate RUN to avoid esbuild ETXTBSY overlayfs conflict)
RUN npm --prefix ui ci

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
