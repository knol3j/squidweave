import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../src/load-env.mjs";
import { RelationalStore } from "../src/lib/relational-store.mjs";

loadEnvFiles();

const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Usage: node scripts/migrate-relational.mjs [DATABASE_URL] [state.json path]");
  console.error("Or set DATABASE_URL in the environment/.env");
  process.exit(1);
}

const stateFile = process.argv[3]
  ? new URL(process.argv[3], import.meta.url)
  : new URL("../data/state.json", import.meta.url);

async function main() {
  const raw = await readFile(stateFile, "utf8");
  const state = JSON.parse(raw);

  const store = new RelationalStore(databaseUrl);
  await store.init();
  console.log("[migrate-relational] connected; saving state to relational tables...");
  await store.saveState(state);
  console.log("[migrate-relational] done.");
  await store.close();
}

main().catch((err) => {
  console.error("[migrate-relational] failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
