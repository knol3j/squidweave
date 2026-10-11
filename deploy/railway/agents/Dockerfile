FROM node:22-slim

WORKDIR /app

# ── System + recon tools (apt) ──────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    curl \
    wget \
    dnsutils \
    whois \
    netcat-openbsd \
    jq \
    procps \
    iputils-ping \
    traceroute \
    net-tools \
    nmap \
    dnsrecon \
    dnsenum \
    nikto \
    wafw00f \
    whatweb \
    dirb \
    gobuster \
    ffuf \
    sqlmap \
    hydra \
    john \
    hashcat \
    smbclient \
    smbmap \
    enum4linux \
    tcpdump \
    arp-scan \
    netcat \
    socat \
    sshpass \
    unzip \
    p7zip-full \
    file \
    binwalk \
    exiftool \
    strings \
    hexdump \
    xxd \
    python3 \
    python3-pip \
    python3-venv \
    ruby \
    perl \
    && rm -rf /var/lib/apt/lists/*

# ── Python-based recon tools ────────────────────────────────────────────────
RUN pip3 install --break-system-packages \
    dnspython \
    scapy \
    python-nmap \
    shodan \
    censys \
    requests \
    beautifulsoup4 \
    lxml

# ── Go-based recon tools (subfinder, httpx, nuclei) ─────────────────────────
RUN ARCH=$(dpkg --print-architecture) && \
    GOARCH=$([ "$ARCH" = "amd64" ] && echo "amd64" || echo "arm64") && \
    mkdir -p /usr/local/bin && \
    curl -sL "https://github.com/projectdiscovery/subfinder/releases/latest/download/subfinder_2.6.6_linux_${GOARCH}.zip" -o /tmp/sf.zip && \
    unzip -q /tmp/sf.zip -d /tmp/sf && cp /tmp/sf/subfinder /usr/local/bin/ && rm -rf /tmp/sf* && \
    curl -sL "https://github.com/projectdiscovery/httpx/releases/latest/download/httpx_1.6.10_linux_${GOARCH}.zip" -o /tmp/hx.zip && \
    unzip -q /tmp/hx.zip -d /tmp/hx && cp /tmp/hx/httpx /usr/local/bin/ && rm -rf /tmp/hx* && \
    curl -sL "https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_3.3.7_linux_${GOARCH}.zip" -o /tmp/nc.zip && \
    unzip -q /tmp/nc.zip -d /tmp/nc && cp /tmp/nc/nuclei /usr/local/bin/ && rm -rf /tmp/nc*

# ── Clone repo and install deps ─────────────────────────────────────────────
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
