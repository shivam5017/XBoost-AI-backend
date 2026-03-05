"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueNonCriticalTask = enqueueNonCriticalTask;
exports.getQueueStats = getQueueStats;
const MAX_QUEUE_SIZE = Number(process.env.NONCRITICAL_QUEUE_MAX || 200);
const CONCURRENCY = Number(process.env.NONCRITICAL_QUEUE_CONCURRENCY || 2);
const queue = [];
let active = 0;
function drain() {
    while (active < CONCURRENCY && queue.length > 0) {
        const task = queue.shift();
        if (!task)
            return;
        active += 1;
        task
            .run()
            .catch((error) => {
            console.error(`[queue] ${task.label} failed:`, error?.message || error);
        })
            .finally(() => {
            active -= 1;
            drain();
        });
    }
}
function enqueueNonCriticalTask(label, run) {
    if (queue.length >= MAX_QUEUE_SIZE) {
        console.warn(`[queue] dropped task (${label}) because queue is full`);
        return;
    }
    queue.push({ label, run });
    drain();
}
function getQueueStats() {
    return {
        queued: queue.length,
        active,
        max: MAX_QUEUE_SIZE,
    };
}
