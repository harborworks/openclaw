export const appDomain = "sparrowtemplate.com";

const getFrontendDomain = () => {
  if ($app.stage === "prod") return appDomain;
  if ($app.stage === "stage") return `stage.${appDomain}`;
  return "localhost:5173";
};

const getBackendDomain = () => {
  if ($app.stage === "prod") return `api.${appDomain}`;
  if ($app.stage === "stage") return `stage-api.${appDomain}`;
  return "localhost:3000";
};

export const frontendDomain = getFrontendDomain();
export const backendDomain = getBackendDomain();

export const frontendUrl =
  $app.stage === "prod" || $app.stage === "stage"
    ? `https://${frontendDomain}`
    : `http://${frontendDomain}`;

export const backendUrl =
  $app.stage === "prod" || $app.stage === "stage"
    ? `https://${backendDomain}`
    : `http://${backendDomain}`;
