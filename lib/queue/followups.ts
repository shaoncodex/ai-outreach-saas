import { Queue } from "bullmq";
import IORedis from "ioredis";

let queue: Queue | null = null;
export function getFollowupQueue() {
  if (!process.env.REDIS_URL) return null;
  if (!queue) {
    const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    queue = new Queue("followups", { connection });
  }
  return queue;
}

export async function scheduleFollowup(data: Record<string, unknown>, delayMs: number) {
  const q = getFollowupQueue();
  if (!q) return { queued: false, reason: "redis_not_configured" };
  const job = await q.add("followup", data, { delay: delayMs, removeOnComplete: 1000, removeOnFail: 1000 });
  return { queued: true, jobId: job.id };
}
