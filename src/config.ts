import * as path from "path";

export type Config = {
  input?: string;
  output?: string;
  ignoreFields?: string[];
};

export const defaultConfig: Config = {
  input: path.join(process.cwd(), "./prisma/schema.prisma"),
  output: path.resolve("./generate/schema.js"),
  ignoreFields: ["createdAt", "updatedAt"],
};
