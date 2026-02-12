/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_cognitoActions from "../admin/cognitoActions.js";
import type * as admin_harbors from "../admin/harbors.js";
import type * as admin_members from "../admin/members.js";
import type * as admin_orgs from "../admin/orgs.js";
import type * as admin_users from "../admin/users.js";
import type * as lib_admin from "../lib/admin.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/cognitoActions": typeof admin_cognitoActions;
  "admin/harbors": typeof admin_harbors;
  "admin/members": typeof admin_members;
  "admin/orgs": typeof admin_orgs;
  "admin/users": typeof admin_users;
  "lib/admin": typeof lib_admin;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
