/* eslint-disable */
/**
 * Generated API stubs - will be overwritten by `npx convex dev`
 */
import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

import type * as memories from "../memories.js";
import type * as agents from "../agents.js";
import type * as connections from "../connections.js";
import type * as activities from "../activities.js";
import type * as stats from "../stats.js";
import type * as seed from "../seed.js";

declare const fullApi: ApiFromModules<{
  memories: typeof memories;
  agents: typeof agents;
  connections: typeof connections;
  activities: typeof activities;
  stats: typeof stats;
  seed: typeof seed;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
