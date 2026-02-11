import { Amplify } from "aws-amplify";

const COGNITO_CONFIG = {
  dev: {
    userPoolId: "us-east-1_2TSTlbc3R",
    userPoolClientId: "12gikf354g3k2crns00m922cnn",
  },
  stage: {
    userPoolId: "us-east-1_PaV7Osv61",
    userPoolClientId: "3fvgnvk8b6q5eo86qrs1k2pk04",
  },
  prod: {
    userPoolId: "us-east-1_FbcunnevD",
    userPoolClientId: "4pdil4br40q8s4i72eb7td2ndm",
  },
} as const;

type Environment = keyof typeof COGNITO_CONFIG;

function resolveEnvironment(): Environment {
  const env = import.meta.env.VITE_APP_ENV;
  if (env && env in COGNITO_CONFIG) return env as Environment;

  const host = window.location.hostname;
  if (host === "app.harborworks.ai") return "prod";
  if (host.includes("stage")) return "stage";
  return "dev";
}

export function configureAmplify() {
  const env = resolveEnvironment();
  const { userPoolId, userPoolClientId } = COGNITO_CONFIG[env];

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        signUpVerificationMethod: "code",
        loginWith: { email: true },
      },
    },
  });
}
