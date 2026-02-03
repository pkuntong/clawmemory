/* eslint-disable */
/**
 * Generated data model types - will be overwritten by `npx convex dev`
 */
import type { DataModelFromSchemaDefinition } from "convex/server";
import type { DocumentByName, TableNamesInDataModel } from "convex/server";
import type { GenericId } from "convex/values";
import type schema from "../schema.js";

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
export type Doc<TableName extends TableNamesInDataModel<DataModel>> =
  DocumentByName<DataModel, TableName>;
export type Id<TableName extends TableNamesInDataModel<DataModel>> =
  GenericId<TableName>;
