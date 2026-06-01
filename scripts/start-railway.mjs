#!/usr/bin/env node

const processType = process.env.SQUIDWEAVE_PROCESS || process.env.RAILWAY_PROCESS || 'api';

if (processType === 'agent' || processType === 'clawdbot') {
  await import('./clawdbot-agent.mjs');
} else {
  await import('../src/server.mjs');
}
