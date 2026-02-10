/**
 * Stale Task Check Job
 *
 * Finds tasks stuck in in_progress or review for too long.
 * For now: just logs them. Later: creates notifications or alerts.
 */

import { tasks } from "@harbor-app/schema";
import { inArray, lt } from "drizzle-orm";
import { db } from "../db";

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function staleTaskCheck(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

  const stale = await db
    .select()
    .from(tasks)
    .where(
      inArray(tasks.status, ["in_progress", "review"])
    );

  // Filter by updatedAt in JS since we need date comparison
  const staleTasks = stale.filter(
    (t) => t.updatedAt && new Date(t.updatedAt) < cutoff
  );

  if (staleTasks.length === 0) return;

  console.log(`[stale-task-check] ${staleTasks.length} stale task(s):`);
  for (const t of staleTasks) {
    const hours = Math.round(
      (Date.now() - new Date(t.updatedAt!).getTime()) / 3600000
    );
    console.log(`  "${t.title}" — ${t.status} for ${hours}h`);
  }
}
