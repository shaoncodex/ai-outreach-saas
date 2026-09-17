import { processOutreachBatch } from "../lib/outreach/engine";

const intervalMs = Math.max(60_000, Number(process.env.OUTREACH_WORKER_INTERVAL_MS || 1_800_000));

async function run() {
  try {
    const report = await processOutreachBatch();
    console.log(JSON.stringify(report));
  } catch (error) {
    console.error(error);
  }
}

void run();
setInterval(() => void run(), intervalMs);
