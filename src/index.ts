import { type Enumerator, getSchema, Model } from "@mrleebo/prisma-ast";
import type { RJSFSchema } from "@rjsf/utils";
import type { Context } from "./type";
import { processModel } from "./core";
import { cloneContext, toJSCode } from "./helper";
export { Config } from "./config";

export async function transform(source: string) {
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

  return toJSCode(schemas);
}
