const CONVEX_URLS = {
  dev: "https://intent-pika-628.convex.cloud",
  stage: "https://cool-kingfisher-264.convex.cloud", // same as prod for now
  prod: "https://cool-kingfisher-264.convex.cloud",
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
