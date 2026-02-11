/**
 * Ticker — runs all daemon jobs on a configurable interval.
 */

import { agentSync } from "./jobs/agent-sync";
import { notificationDispatch } from "./jobs/notification-dispatch";
import { secretSync } from "./jobs/secret-sync";

export type Job = {
  name: string;
  fn: () => Promise<void>;
  /** Run every N ticks (1 = every tick) */
  everyNTicks: number;
};

const jobs: Job[] = [
  { name: "secret-sync", fn: secretSync, everyNTicks: 1 }, // every tick — fast pickup
  { name: "notification-dispatch", fn: notificationDispatch, everyNTicks: 1 },
  { name: "agent-sync", fn: agentSync, everyNTicks: 6 }, // every ~60s at 10s tick
];

let tickCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;

async function tick(): Promise<void> {
  tickCount++;
  for (const job of jobs) {
    if (tickCount % job.everyNTicks !== 0) continue;
    try {
      await job.fn();
    } catch (err) {
      console.error(`[ticker] job "${job.name}" failed:`, err);
    }
  }
}

export function start(intervalMs: number): void {
  console.log(
    `[ticker] starting with ${intervalMs}ms interval, ${jobs.length} jobs`
  );
  // Run immediately on start
  tick();
  timer = setInterval(tick, intervalMs);
}

export function stop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[ticker] stopped");
  }
}
