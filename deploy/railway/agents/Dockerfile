FROM node:22-slim

WORKDIR /app

# ── System + recon tools ────────────────────────────────────────────────────
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
    masscan \
    dnsrecon \
    dnsenum \
    fierce \
    dmitry \
    theharvester \
    nikto \
    wafw00f \
    whatweb \
    dirb \
    gobuster \
    ffuf \
    sqlmap \
    wpscan \
    hydra \
    john \
    hashcat \
    crackmapexec \
    smbclient \
    smbmap \
    enum4linux \
    onesixtyone \
    snmp \
    snmp-mibs-downloader \
    tcpdump \
    arp-scan \
    netdiscover \
    nbtscan \
    sslscan \
    sslyze \
    testssl.sh \
    ike-scan \
    netcat \
    socat \
    proxychains4 \
    tor \
    sshpass \
    rsync \
    unzip \
    p7zip-full \
    xz-utils \
    bzip2 \
    zstd \
    file \
    binwalk \
    exiftool \
    strings \
    hexdump \
    xxd \
    od \
    ltrace \
    strace \
    gdb \
    ltrace \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    libssl-dev \
    libffi-dev \
    ruby \
    ruby-dev \
    perl \
    php-cli \
    && rm -rf /var/lib/apt/lists/*

# ── Install Go-based recon tools ────────────────────────────────────────────
RUN ARCH=$(dpkg --print-architecture) && \
    GOARCH=$([ "$ARCH" = "amd64" ] && echo "amd64" || echo "arm64") && \
    curl -sL "https://github.com/projectdiscovery/subfinder/releases/latest/download/subfinder_2.6.6_linux_${GOARCH}.zip" -o /tmp/subfinder.zip && \
    unzip -q /tmp/subfinder.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/subfinder && \
    rm /tmp/subfinder.zip && \
    curl -sL "https://github.com/projectdiscovery/httpx/releases/latest/download/httpx_1.6.10_linux_${GOARCH}.zip" -o /tmp/httpx.zip && \
    unzip -q /tmp/httpx.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/httpx && \
    rm /tmp/httpx.zip && \
    curl -sL "https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_3.3.7_linux_${GOARCH}.zip" -o /tmp/nuclei.zip && \
    unzip -q /tmp/nuclei.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/nuclei && \
    rm /tmp/nuclei.zip && \
    curl -sL "https://github.com/owasp-amass/amass/releases/latest/download/amass_Linux_${GOARCH}.zip" -o /tmp/amass.zip && \
    unzip -q /tmp/amass.zip -d /usr/local/bin/ && \
    mv /usr/local/bin/amass_Linux_${GOARCH}/amass /usr/local/bin/amass && \
    chmod +x /usr/local/bin/amass && \
    rm -rf /tmp/amass.zip /usr/local/bin/amass_Linux_${GOARCH}

# ── Install Python-based tools ──────────────────────────────────────────────
RUN pip3 install --break-system-packages \
    theHarvester \
    dnspython \
    scapy \
    impacket \
    python-nmap \
    shodan \
    censys \
    requests \
    beautifulsoup4 \
    lxml \
    pyOpenSSL \
    cryptography

# ── Install Node-based tools ────────────────────────────────────────────────
RUN npm install -g \
    retire \
    npm-audit-html

# ── Install recon-ng ────────────────────────────────────────────────────────
RUN git clone --depth 1 https://gitlab.com/kalilinux/packages/recon-ng.git /tmp/recon-ng && \
    cd /tmp/recon-ng && \
    pip3 install --break-system-packages -r REQUIREMENTS && \
    ln -sf /tmp/recon-ng/recon-ng /usr/local/bin/recon-ng && \
    rm -rf /tmp/recon-ng

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
