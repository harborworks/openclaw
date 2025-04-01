import { userPool, userPoolClient } from "./auth";
import { backendUrl, frontendDomain, frontendUrl } from "./urls";

export const frontend = new sst.aws.StaticSite("Frontend", {
  path: "packages/frontend",
  build: {
    command: "npm run build",
    output: "dist",
  },
  dev: {
    command: "npm run dev",
  },
  domain: frontendDomain,
  environment: {
    VITE_AUTHORITY: userPool.id.apply(
      (id) => `https://cognito-idp.us-east-1.amazonaws.com/${id}`
    ),
    VITE_CLIENT_ID: userPoolClient.id,
    VITE_REDIRECT_URI: frontendUrl,
    VITE_LOGOUT_URI: `${frontendUrl}`,
    VITE_API_URL: backendUrl,
  },
});
