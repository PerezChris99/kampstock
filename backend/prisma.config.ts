import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL || "";
const isPg = dbUrl.startsWith("postgresql") || dbUrl.startsWith("postgres");

export default defineConfig({
  schema: isPg ? "prisma-pg/schema.prisma" : "prisma/schema.prisma",
  // Use string directly — env() throws if the variable is absent (e.g. during build)
  datasource: { url: dbUrl || "postgresql://placeholder:placeholder@localhost:5432/placeholder" },
  migrations: { seed: "ts-node prisma/seed.ts" },
});
