import { PreSignUpAdminCreateUserTriggerEvent } from "aws-lambda";
import axios from "axios";

export const handler = async (event: PreSignUpAdminCreateUserTriggerEvent) => {
  try {
    const email = event.request.userAttributes.email;
    const cognitoId = event.userName;

    // Call the backend API to create a user in the database
    await axios.post(`${process.env.API_URL}/api/users`, {
      email,
      cognitoId,
    });

    console.log(`User ${email} with ID ${cognitoId} created successfully`);
  } catch (error) {
    console.error("Error creating user in backend:", error);
    // We don't want to block the user sign-up process even if our backend call fails
    // The user can be created later by an admin if needed
  }

  // Return the event to allow the Cognito flow to continue
  return event;
};
