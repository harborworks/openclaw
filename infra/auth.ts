import { backendUrl, frontendUrl } from "./urls";

export const userPool = new sst.aws.CognitoUserPool("UserPool", {
  usernames: ["email"],
  triggers: {
    preSignUp: {
      environment: {
        API_URL: backendUrl,
      },
      handler: "packages/functions/src/userPreSignUp.handler",
    },
  },
  transform: {
    userPool: {
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: true,
      },
    },
  },
});

export const userPoolClient = userPool.addClient("WebClient", {
  transform: {
    client: { callbackUrls: [frontendUrl], logoutUrls: [frontendUrl] },
  },
});

const slug = "sparrow-tags";
new aws.cognito.UserPoolDomain("AuthDomain", {
  userPoolId: userPool.id,
  domain: $app.stage === "prod" ? slug : `${slug}-${$app.stage}`,
});
