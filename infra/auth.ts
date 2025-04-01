import { frontendUrl } from "./urls";

export const userPool = new sst.aws.CognitoUserPool("UserPool", {
  usernames: ["email"],
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

new aws.cognito.UserPoolDomain("AuthDomain", {
  userPoolId: userPool.id,
  domain: `template-app-${$app.stage}`,
});
