import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import {
  applyPgEnvNormalization,
  normalizePgConnectionString,
} from "./src/lib/pg-connection";

applyPgEnvNormalization();

const rawDatabaseUrl =
  process.env.INSFORGE_DATABASE_URL ?? env("DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: normalizePgConnectionString(rawDatabaseUrl),
  },
});
