import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function stripQuotes(value) {
  if (!value) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];
  if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEnvFile(raw) {
  const entries = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());
    if (!key) {
      continue;
    }
    entries.push([key, value]);
  }
  return entries;
}

export function loadEnvFiles(cwd = process.cwd()) {
  const candidates = [
    resolve(cwd, ".env"),
    resolve(cwd, ".env.local"),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }

    const contents = readFileSync(filePath, "utf8");
    for (const [key, value] of parseEnvFile(contents)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
