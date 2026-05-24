FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    bash \
    xz-utils \
  && rm -rf /var/lib/apt/lists/*

# Install Hermes Agent CLI
RUN curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

ENV PATH="/root/.local/bin:${PATH}"
WORKDIR /app

COPY deploy/railway/worker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
