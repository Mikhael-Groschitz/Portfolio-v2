import { defineConfig } from "prisma/config";
import { cliDatabaseUrl, loadEnvironment } from "./src/server/env";

loadEnvironment();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: cliDatabaseUrl(process.env) },
});
