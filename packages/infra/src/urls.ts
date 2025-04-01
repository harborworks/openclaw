export const appDomain = "sparrowtags.com";

export const frontendDomain =
  $app.stage === "prod" ? appDomain : "localhost:5173";

export const frontendUrl =
  $app.stage === "prod"
    ? `https://${frontendDomain}`
    : `http://${frontendDomain}`;

export const backendDomain =
  $app.stage === "prod" ? `api.${appDomain}` : "localhost:3000";

export const backendUrl =
  $app.stage === "prod"
    ? `https://${backendDomain}`
    : `http://${backendDomain}`;
