import { PgBoss } from "pg-boss";
import { config } from "../config.mjs";

let boss = null;

export async function getQueue() {
  if (boss) return boss;
  if (!config.databaseUrl) {
    throw new Error("Job queue requires DATABASE_URL");
  }
  boss = new PgBoss({
    connectionString: config.databaseUrl,
    application_name: "squidweave-worker",
    schema: config.postgresSchema,
  });
  boss.on("error", (err) => {
    console.error("[queue] error:", err.message);
  });
  await boss.start();
  return boss;
}

export async function closeQueue() {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}

export async function enqueue(name, data, options = {}) {
  const queue = await getQueue();
  return queue.send(name, data, options);
}

export async function subscribe(name, handler) {
  const queue = await getQueue();
  return queue.work(name, handler);
}
