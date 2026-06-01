FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
  && rm -rf /var/lib/apt/lists/*

ARG SQUIDWEAVE_REPO=https://github.com/knol3j/squidweave.git
ARG SQUIDWEAVE_REF=master

ADD https://api.github.com/repos/knol3j/squidweave/commits/master /tmp/squidweave-version.json
RUN git clone --depth 1 --branch "$SQUIDWEAVE_REF" "$SQUIDWEAVE_REPO" /app \
  && npm ci --omit=dev

ENV NODE_ENV=production
ENV CLAWDBOT_ROLE=supervisor
ENV SQUIDWEAVE_SITE_URL=https://knol3j.github.io/squidweave/
ENV GITHUB_REPOSITORY=knol3j/squidweave

CMD ["node", "scripts/clawdbot-agent.mjs"]
