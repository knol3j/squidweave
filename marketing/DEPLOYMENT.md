# SquidWeave — Deployment Guide

## GitHub Pages Setup (Landing Page + App)

The landing page (`marketing/landing/index.html`) and the UI app are deployed together to GitHub Pages.

### URL Structure

| Path | Content |
|------|---------|
| `/` | Landing page (marketing site) |
| `/app/` | SquidWeave application (React + Vite build) |

### Setup Steps

**1. Enable GitHub Pages**

Go to **Settings → Pages** in your repo and set:
- **Source**: GitHub Actions

**2. Add the Deploy Workflow**

Create `.github/workflows/deploy.yml` with this exact content:

```yaml
name: Deploy Landing Page + App to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install UI dependencies
        run: |
          cd ui
          npm install

      - name: Build UI app
        run: |
          cd ui
          npm run build

      - name: Prepare combined site
        run: |
          mkdir -p _site/app
          cp marketing/landing/index.html _site/index.html
          cp -r ui/dist/* _site/app/
          if [ ! -f _site/app/index.html ]; then
            echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=./"></head></html>' > _site/app/index.html
          fi

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '_site'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**3. Trigger Deployment**

Push to `main` or manually trigger the workflow from **Actions → Deploy Landing Page + App → Run workflow**.

### What Gets Deployed

The workflow:
1. Checks out the repo
2. Installs Node 22 and UI dependencies
3. Builds the Vite app (`ui/dist/`)
4. Copies landing page to `_site/index.html`
5. Copies built app to `_site/app/`
6. Deploys everything to GitHub Pages
