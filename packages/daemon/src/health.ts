/**
 * Minimal health check HTTP server for the daemon.
 */

import { createServer } from "http";

export function startHealthServer(port: number): void {
  const server = createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[daemon] health server on :${port}/health`);
  });
}
