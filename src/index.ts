import { type Enumerator, type Model, getSchema } from "@mrleebo/prisma-ast";
import type { RJSFSchema } from "@rjsf/utils";
import type { Context } from "./type";
import { processModel } from "./core";
import { cloneContext, toCode } from "./helper";

export type { Config } from "./config";
export type { JSONSchema, JSONSchemaOutput } from "./helper";
export { schemaBuilder } from "./utils";

export async function transform(
  source: string,
  language: "javascript" | "typescript" = "javascript"
) {
  const prismaSchema = getSchema(source);

  const list = prismaSchema.list.sort((a, b) => (a.type === "enum" ? -1 : 0));

  const enums: Record<string, string[]> = {};

  const schemas: Record<string, RJSFSchema> = {};

  const ctx: Partial<Context> = {
    enums,
    prismaSchema: list
      .filter((item) => item.type === "model")
      .reduce((a: Record<string, Model>, b: Model) => {
        a[b.name] = b;
        return a;
      }, {}),
  };

  for (const item of list) {
    try {
      const { type } = item;
      if (type === "enum") {
        enums[item.name] = item.enumerators.map(
          (item) => (item as Enumerator).name
        );
      } else if (type === "model") {
        const currCtx = cloneContext(ctx, item.name);
        processModel(currCtx, item);
        schemas[item.name] = currCtx.node;
      }
    } catch {}
  }

  return toCode(schemas, language);
}
