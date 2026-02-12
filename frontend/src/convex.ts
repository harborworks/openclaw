const CONVEX_URLS = {
  dev: "https://intent-pika-628.convex.cloud",
  stage: "", // TODO
  prod: "", // TODO
} as const;

type Environment = keyof typeof CONVEX_URLS;

function resolveEnvironment(): Environment {
  const env = import.meta.env.VITE_APP_ENV;
  if (env && env in CONVEX_URLS) return env as Environment;

  const host = window.location.hostname;
  if (host === "app.harborworks.ai") return "prod";
  if (host.includes("stage")) return "stage";
  return "dev";
}

export const CONVEX_URL = CONVEX_URLS[resolveEnvironment()];
