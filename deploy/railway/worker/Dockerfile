FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    bash \
    xz-utils \
  && rm -rf /var/lib/apt/lists/*

# Install Hermes Agent CLI with retry
RUN for i in 1 2 3; do \
      curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash && break; \
      echo "Hermes install attempt $i failed, retrying..." && sleep 3; \
    done

ENV PATH="/root/.local/bin:${PATH}"
WORKDIR /app

# Create hermes home and copy prism skills
RUN mkdir -p /app/.hermes
COPY deploy/railway/worker/skills/ /app/.hermes/skills/

COPY deploy/railway/worker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
