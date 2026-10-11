FROM python:3.12-slim

# Install system dependencies (libatomic1 is needed by Hermes's bundled Node)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    bash \
    xz-utils \
    libatomic1 \
    cron \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 (Hermes agents reuse SquidWeave Node scripts)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# Install Hermes Agent CLI with retry
RUN for i in 1 2 3; do \
      curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash && break; \
      echo "Hermes install attempt $i failed, retrying..." && sleep 3; \
    done

ENV PATH="/root/.local/bin:${PATH}"
WORKDIR /app

# Create hermes home and copy skills / agent scripts
RUN mkdir -p /app/.hermes
COPY deploy/railway/worker/skills/ /app/.hermes/skills/
COPY deploy/railway/worker/scripts/ /app/.hermes/scripts/

COPY deploy/railway/worker/start.sh /app/start.sh
RUN chmod +x /app/start.sh /app/.hermes/scripts/*.py

ENV HERMES_HOME=/app/.hermes
ENV SQUIDWEAVE_REPO_DIR=/app/squidweave

CMD ["/app/start.sh"]
