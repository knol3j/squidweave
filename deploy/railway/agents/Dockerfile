FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    curl \
    dnsutils \
    whois \
    netcat-openbsd \
    jq \
    nmap \
    nikto \
    wafw00f \
    whatweb \
    gobuster \
    ffuf \
    hydra \
    smbclient \
    tcpdump \
    python3 \
    python3-pip \
    unzip \
    file \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages dnspython requests shodan

ARG SQUIDWEAVE_REPO=https://github.com/knol3j/squidweave.git
ARG SQUIDWEAVE_REF=main

ADD https://api.github.com/repos/knol3j/squidweave/commits/main /tmp/squidweave-version.json
RUN git clone --depth 1 --branch "$SQUIDWEAVE_REF" "$SQUIDWEAVE_REPO" /app \
  && npm ci --omit=dev

ENV NODE_ENV=production
ENV CLAWDBOT_ROLE=supervisor
ENV SQUIDWEAVE_SITE_URL=https://knol3j.github.io/squidweave/
ENV GITHUB_REPOSITORY=knol3j/squidweave

RUN addgroup --system app && adduser --system --ingroup app app
USER app
CMD ["node", "scripts/clawdbot-agent.mjs"]
