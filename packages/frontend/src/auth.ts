import { WebStorageStateStore } from "oidc-client-ts";

export const cognitoAuthConfig = {
  authority: import.meta.env.VITE_AUTHORITY,
  client_id: import.meta.env.VITE_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_REDIRECT_URI,
  logout_uri: import.meta.env.VITE_LOGOUT_URI,
  automaticSilentRenew: true,
  response_type: "code",
  scope: "openid profile email",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  revokeTokensOnSignout: false,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
};
