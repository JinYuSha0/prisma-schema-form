import type { JSONSchemaOutput } from "./helper";
import type { JSONSchema7 } from "json-schema";
import { cloneDeep, omit, without } from "es-toolkit";

type ExtractDefinitionName<T> = T extends JSONSchema7
  ? {
      [K in keyof T["items"]]: K;
    }[keyof T["items"]]
  : never;

type ExtractName<T> = T extends `$def_${infer Name}` ? Name : never;

type Paths<T, P extends readonly any[] = []> = T extends JSONSchemaOutput
  ? {
      [K in keyof T["properties"]]: T["properties"][K] extends JSONSchema7
        ? T["properties"][K]["items"] extends undefined
          ? [...P, K]
          : T["properties"][K]["items"] extends { $ref: string }
          ? Partial<
              Paths<
                T["definitions"][ExtractName<
                  ExtractDefinitionName<T["properties"][K]>
                >],
                [...P, K]
              >
            >
          : [...P, K]
        : [...P, K];
    }[keyof T["properties"]]
  : [...P];

class SchemaBuilder<T extends JSONSchemaOutput> {
  private model: T;

  constructor(model: T) {
    this.model = cloneDeep(model);
  }

  omit<K extends keyof T["properties"], C extends boolean>(
    condition: C,
    ...keys: K[]
  ): C extends true
    ? SchemaBuilder<
        Omit<T, "properties"> & {
          properties: Omit<T["properties"], (typeof keys)[number]>;
        }
      >
    : SchemaBuilder<T> {
    if (condition === true) {
      this.model = {
        ...this.model,
        properties: omit(this.model.properties ?? {}, keys as string[]),
        required: without(this.model.required, ...(keys as string[])),
      };
      return this as any;
    }
    return this as any;
  }

  omitDeep<C extends boolean, P extends Paths<T>>(
    condition: C,
    paths: P
  ): SchemaBuilder<T> {
    const _paths = paths as string[];
    if (condition && _paths?.length > 0) {
      let root = this.model;
      const prevPaths = _paths.slice(0, -1);
      const property = _paths.slice(-1)[0];
      for (const path of prevPaths) {
        if (root["properties"][path]) {
          const $ref = root["properties"][path]["items"]["$ref"];
          const def = $ref.replace("#/definitions/", "");
          if (root["definitions"][def]) {
            root = root["definitions"][def] as any;
          }
        }
      }
      delete root["properties"][property];
    }
    return this as any;
  }

  appendBefore<R extends Record<string, JSONSchema7>>(
    key: keyof T["properties"],
    fields: R
  ): SchemaBuilder<
    T & {
      properties: { [K in keyof R]: JSONSchema7 };
    }
  > {
    const entries = Object.entries(this.model.properties);
    const targetIndex = entries.findIndex(([currKey]) => currKey === key);
    const appendEntries = Object.entries(fields);
    const newEntries = [
      ...entries.slice(0, targetIndex),
      ...appendEntries,
      ...entries.slice(targetIndex),
    ];
    for (const appendEntry of appendEntries) {
      if (appendEntry[1].required) {
        this.model.required = [
          ...new Set([...this.model.required, ...appendEntry[1].required]),
        ];
      }
      if (appendEntry[1].definitions) {
        Object.assign(this.model.definitions, appendEntry[1].definitions);
      }
    }
    this.model.properties = Object.fromEntries(newEntries);
    return this as any;
  }

  appendAfter<R extends Record<string, JSONSchema7>>(
    key: keyof T["properties"],
    fields: R
  ): SchemaBuilder<
    T & {
      properties: { [K in keyof R]: JSONSchema7 };
    }
  > {
    const entries = Object.entries(this.model.properties);
    const targetIndex = entries.findIndex(([currKey]) => currKey === key) + 1;
    const appendEntries = Object.entries(fields);
    const newEntries = [
      ...entries.slice(0, targetIndex),
      ...appendEntries,
      ...entries.slice(targetIndex),
    ];
    for (const appendEntry of appendEntries) {
      if (appendEntry[1].required) {
        this.model.required = [
          ...new Set([...this.model.required, ...appendEntry[1].required]),
        ];
      }
      if (appendEntry[1].definitions) {
        Object.assign(this.model.definitions, appendEntry[1].definitions);
      }
    }
    this.model.properties = Object.fromEntries(newEntries);
    return this as any;
  }

  build() {
    return this.model;
  }
}

export function schemaBuilder<T extends JSONSchemaOutput>(model: T) {
  return new SchemaBuilder(model);
}
