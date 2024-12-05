import type { JSONSchemaOutput } from "./helper";
import type { JSONSchema7 } from "json-schema";
import { cloneDeep, omit, without } from "es-toolkit";

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
