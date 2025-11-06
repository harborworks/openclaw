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
    userPool: (args) => {
      args.adminCreateUserConfig = {
        allowAdminCreateUserOnly: true,
        inviteMessageTemplate: {
          emailMessage: `<p>You have been invited to the Sparrow Tags App. You can sign in at ${frontendUrl}.</p><br><p>Username: {username}</p><p>Temporary password: {####}</p>`,
          emailSubject: "Your temporary password for Sparrow Tags",
          smsMessage:
            "<p>Welcome to Sparrow Tags!</p><p>Username: {username}</p><p>Temporary password: {####}</p>",
        },
      };
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
