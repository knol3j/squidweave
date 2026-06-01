FROM node:22-slim

WORKDIR /app

COPY package*.json ./
COPY ui/package*.json ./ui/

RUN npm ci --omit=optional && npm --prefix ui ci

COPY . .

RUN npm run ui:build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4010
ENV STATIC_DIR=/app/ui/dist
ENV UI_USER=admin
ENV UI_PASS=squidweave

EXPOSE 4010

CMD ["node", "scripts/start-railway.mjs"]
