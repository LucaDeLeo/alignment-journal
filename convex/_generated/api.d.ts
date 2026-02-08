/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articles from "../articles.js";
import type * as audit from "../audit.js";
import type * as decisions from "../decisions.js";
import type * as discussions from "../discussions.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_errors from "../helpers/errors.js";
import type * as helpers_roles from "../helpers/roles.js";
import type * as helpers_transitions from "../helpers/transitions.js";
import type * as invitations from "../invitations.js";
import type * as matching from "../matching.js";
import type * as matchingActions from "../matchingActions.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as pdfExtraction from "../pdfExtraction.js";
import type * as pdfExtractionActions from "../pdfExtractionActions.js";
import type * as reviewerAbstracts from "../reviewerAbstracts.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as storage from "../storage.js";
import type * as submissions from "../submissions.js";
import type * as triage from "../triage.js";
import type * as triageActions from "../triageActions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  articles: typeof articles;
  audit: typeof audit;
  decisions: typeof decisions;
  discussions: typeof discussions;
  "helpers/auth": typeof helpers_auth;
  "helpers/errors": typeof helpers_errors;
  "helpers/roles": typeof helpers_roles;
  "helpers/transitions": typeof helpers_transitions;
  invitations: typeof invitations;
  matching: typeof matching;
  matchingActions: typeof matchingActions;
  notifications: typeof notifications;
  payments: typeof payments;
  pdfExtraction: typeof pdfExtraction;
  pdfExtractionActions: typeof pdfExtractionActions;
  reviewerAbstracts: typeof reviewerAbstracts;
  reviews: typeof reviews;
  seed: typeof seed;
  storage: typeof storage;
  submissions: typeof submissions;
  triage: typeof triage;
  triageActions: typeof triageActions;
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
