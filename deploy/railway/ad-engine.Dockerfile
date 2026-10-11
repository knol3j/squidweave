FROM node:22-slim

WORKDIR /app

# Ad Engine backend only — no frontend build, no electron devDeps.
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY api/ ./api/

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/contacts', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "api/server.mjs"]
