import fs from "node:fs/promises";
import path from "node:path";

type QueueItem = {
  id: string;
  status: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

const queueFilePath = process.env.QUEUE_FILE_PATH
  ? path.resolve(process.env.QUEUE_FILE_PATH)
  : path.join(process.cwd(), "queue", "failed-tweets.json");

async function ensureQueueDir(): Promise<void> {
  await fs.mkdir(path.dirname(queueFilePath), { recursive: true });
}

async function loadQueue(): Promise<QueueItem[]> {
  try {
    const raw = await fs.readFile(queueFilePath, "utf-8");
    const parsed = JSON.parse(raw) as QueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(items: QueueItem[]): Promise<void> {
  await ensureQueueDir();
  await fs.writeFile(queueFilePath, JSON.stringify(items, null, 2), "utf-8");
}

export async function enqueueFailedTweet(
  status: string,
  error?: unknown
): Promise<void> {
  const queue = await loadQueue();

  const item: QueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: error instanceof Error ? error.message : String(error ?? "unknown")
  };

  queue.push(item);
  await saveQueue(queue);
}

export async function retryQueuedTweets(
  publish: (status: string) => Promise<void>
): Promise<void> {
  const queue = await loadQueue();
  if (queue.length === 0) return;

  const nextQueue: QueueItem[] = [];

  for (let index = 0; index < queue.length; index++) {
    const item = queue[index];

    try {
      await publish(item.status);
      console.log(`✅ Queued tweet sent: ${item.id}`);
    } catch (error) {
      item.attempts += 1;
      item.lastError = error instanceof Error ? error.message : String(error);
      nextQueue.push(item, ...queue.slice(index + 1));

      console.warn(`⚠️ Queued tweet still failing: ${item.id}`);
      break;
    }
  }

  await saveQueue(nextQueue);
}
