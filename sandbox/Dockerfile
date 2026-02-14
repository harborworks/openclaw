FROM python:3.12-slim

# Node.js 22
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends \
    nodejs \
    git \
    wget \
    jq \
    less \
    vim-tiny \
    openssh-client \
    unzip \
    zip \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

# Create sandbox user (1000:1000)
RUN groupadd -g 1000 sandbox && useradd -u 1000 -g 1000 -m -s /bin/bash sandbox

# ClawVault + GitHub CLI
RUN npm install -g clawvault@2.4.5 \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update && apt-get install -y --no-install-recommends gh=2.86.0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
USER 1000:1000
