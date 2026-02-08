/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as decisions from "../decisions.js";
import type * as invitations from "../invitations.js";
import type * as matching from "../matching.js";
import type * as pdfExtraction from "../pdfExtraction.js";
import type * as reviews from "../reviews.js";
import type * as storage from "../storage.js";
import type * as submissions from "../submissions.js";
import type * as triage from "../triage.js";
import type * as users from "../users.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_errors from "../helpers/errors.js";
import type * as helpers_roles from "../helpers/roles.js";
import type * as helpers_transitions from "../helpers/transitions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  decisions: typeof decisions;
  invitations: typeof invitations;
  matching: typeof matching;
  pdfExtraction: typeof pdfExtraction;
  reviews: typeof reviews;
  storage: typeof storage;
  submissions: typeof submissions;
  triage: typeof triage;
  users: typeof users;
  "helpers/auth": typeof helpers_auth;
  "helpers/errors": typeof helpers_errors;
  "helpers/roles": typeof helpers_roles;
  "helpers/transitions": typeof helpers_transitions;
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
