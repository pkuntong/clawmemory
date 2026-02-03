/* eslint-disable */
/**
 * Generated server types - will be overwritten by `npx convex dev`
 */
import {
  GenericQueryCtx,
  GenericMutationCtx,
  GenericActionCtx,
  FunctionReference,
  QueryBuilder,
  MutationBuilder,
  ActionBuilder,
  HttpActionBuilder,
} from "convex/server";
import type { DataModel } from "./dataModel.js";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;

export declare const query: QueryBuilder<DataModel, "public">;
export declare const internalQuery: QueryBuilder<DataModel, "internal">;
export declare const mutation: MutationBuilder<DataModel, "public">;
export declare const internalMutation: MutationBuilder<DataModel, "internal">;
export declare const action: ActionBuilder<DataModel, "public">;
export declare const internalAction: ActionBuilder<DataModel, "internal">;
export declare const httpAction: HttpActionBuilder;
