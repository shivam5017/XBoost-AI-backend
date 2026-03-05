type Task = {
  label: string;
  run: () => Promise<void>;
};

const MAX_QUEUE_SIZE = Number(process.env.NONCRITICAL_QUEUE_MAX || 200);
const CONCURRENCY = Number(process.env.NONCRITICAL_QUEUE_CONCURRENCY || 2);

const queue: Task[] = [];
let active = 0;

function drain(): void {
  while (active < CONCURRENCY && queue.length > 0) {
    const task = queue.shift();
    if (!task) return;

    active += 1;
    task
      .run()
      .catch((error) => {
        console.error(`[queue] ${task.label} failed:`, (error as Error)?.message || error);
      })
      .finally(() => {
        active -= 1;
        drain();
      });
  }
}

export function enqueueNonCriticalTask(label: string, run: () => Promise<void>): void {
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn(`[queue] dropped task (${label}) because queue is full`);
    return;
  }
  queue.push({ label, run });
  drain();
}

export function getQueueStats(): { queued: number; active: number; max: number } {
  return {
    queued: queue.length,
    active,
    max: MAX_QUEUE_SIZE,
  };
}

