import {
  AdminCreateUserCommand,
  AdminCreateUserCommandOutput,
  CognitoIdentityProviderClient,
  DeliveryMediumType,
} from "@aws-sdk/client-cognito-identity-provider";
import config from "../config";

// Initialize the Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognitoRegion,
});

/**
 * Invites a user to the application by creating a user in Cognito and sending an invitation email
 * @param email - The email of the user to invite
 * @returns The result of the invitation
 */
export const inviteUser = async (
  email: string
): Promise<AdminCreateUserCommandOutput> => {
  const params = {
    UserPoolId: config.userPoolId,
    Username: email,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "email_verified",
        Value: "true",
      },
    ],
    DesiredDeliveryMediums: [DeliveryMediumType.EMAIL],
  };

  const command = new AdminCreateUserCommand(params);

  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error inviting user to Cognito:", error);
    throw error;
  }
};
