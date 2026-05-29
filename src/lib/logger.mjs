/**
 * Structured logger using console with JSON formatting.
 * Drop-in replacement for console.log/error with structured output.
 * No external dependencies — uses Node.js built-in.
 */

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? 2;

function formatEntry(level, message, meta = {}) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  });
}

function log(level, message, meta) {
  if (LEVELS[level] > currentLevel) return;
  const entry = formatEntry(level, message, meta);
  if (level === 'error') {
    console.error(entry);
  } else if (level === 'warn') {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

export const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),

  child: (prefix = {}) => ({
    error: (msg, meta) => log('error', msg, { ...prefix, ...meta }),
    warn: (msg, meta) => log('warn', msg, { ...prefix, ...meta }),
    info: (msg, meta) => log('info', msg, { ...prefix, ...meta }),
    debug: (msg, meta) => log('debug', msg, { ...prefix, ...meta }),
  }),
};

export default logger;
