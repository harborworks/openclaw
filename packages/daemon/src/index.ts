import config from "./config";
import { start, stop } from "./ticker";
import { startHealthServer } from "./health";

console.log("[daemon] starting...");
console.log(`[daemon] env=${config.nodeEnv} tick=${config.tickIntervalMs}ms`);

startHealthServer(config.port);
start(config.tickIntervalMs);

// Graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`[daemon] received ${sig}, shutting down`);
    stop();
    process.exit(0);
  });
}
