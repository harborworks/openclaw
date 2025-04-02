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

const slug = "sparrow-tags";
new aws.cognito.UserPoolDomain("AuthDomain", {
  userPoolId: userPool.id,
  domain: $app.stage === "prod" ? slug : `${slug}-${$app.stage}`,
});
