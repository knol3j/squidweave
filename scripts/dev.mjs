#!/usr/bin/env node
import { spawn } from 'node:child_process';

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  child.on('exit', code => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exitCode = code;
    }
  });
  return child;
}

const backend = run('backend', 'node', ['src/server.mjs']);
const frontend = run('frontend', 'npm', ['--prefix', 'ui', 'run', 'dev']);

function shutdown(signal) {
  backend.kill(signal);
  frontend.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
