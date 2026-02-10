/**
 * Stale Task Check
 *
 * Polls the Harbor API for tasks stuck in active states too long.
 * Future: notify the PM agent or create alerts.
 */

import * as harbor from "../harbor-client";

const STALE_HOURS = 24;

export async function staleTaskCheck(): Promise<void> {
  const tasks = await harbor.getTasks();

  const activeTasks = tasks.filter((t) =>
    ["in_progress", "review"].includes(t.status)
  );

  if (activeTasks.length === 0) return;

  // For now just log — we don't have updatedAt in the API response yet
  console.log(
    `[stale-task-check] ${activeTasks.length} task(s) in active states`
  );
  for (const t of activeTasks) {
    console.log(`  ${t.status}: "${t.title}"`);
  }
}
