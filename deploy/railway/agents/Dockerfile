FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY automation ./automation
COPY scripts ./scripts
COPY src ./src
COPY package.json ./package.json

ENV NODE_ENV=production
ENV CLAWDBOT_ROLE=supervisor
ENV SQUIDWEAVE_SITE_URL=https://knol3j.github.io/squidweave/
ENV GITHUB_REPOSITORY=knol3j/squidweave

CMD ["node", "scripts/clawdbot-agent.mjs"]
