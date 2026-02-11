import { Amplify } from "aws-amplify";

export function configureAmplify() {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;
  if (!userPoolId || !userPoolClientId) {
    throw new Error(
      "Missing Cognito config. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_APP_CLIENT_ID.",
    );
  }

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
