# SquidWeave automation + design playbook

This package makes campaign setup fully automatable with both structured data and visual direction.

## What was added

1) Blueprint dataset
- automation/blueprints/global-b2b-launch.json
- Includes:
  - campaign mission + operating fields
  - research records
  - prospect contacts
  - design elements (theme, palette, guidelines, content angles)

2) One-command bootstrap script
- scripts/bootstrap-automation.mjs
- Loads the blueprint into live API endpoints:
  - POST /campaigns
  - POST /research/records
  - POST /prospects/import
  - GET /prospecting/plan
  - GET /prospects/pipeline

3) Campaign model extension for design automation
- src/server.mjs buildCampaignInput now supports:
  - designTheme
  - designPalette
  - designGuidelines
  - contentAngles

4) Frontend typed support
- ui/src/services/dataService.ts Campaign interface now includes matching design fields.

5) NPM command
- package.json script:
  - npm run automation:bootstrap

## Usage

1) Start backend
- npm start

2) Run bootstrap
- npm run automation:bootstrap

3) Optional alternate API base
- SQUIDWEAVE_API_BASE=https://squidweave-api-production.up.railway.app npm run automation:bootstrap

## Result
After running, SquidWeave has a fully loaded mission with:
- strategy context
- ranked research inputs
- initial contacts for enrichment/sequencing
- explicit design system metadata that agents can use when generating creative/content

## Next recommended step
Create additional blueprints by ICP/market and run bootstrap per campaign to operationalize multi-client autonomous onboarding.
