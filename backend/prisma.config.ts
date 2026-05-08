import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const dbUrl = process.env.DATABASE_URL || "";
const isPg = dbUrl.startsWith("postgresql") || dbUrl.startsWith("postgres");

export default defineConfig({
  schema: isPg ? "prisma-pg/schema.prisma" : "prisma/schema.prisma",
  datasource: { url: env("DATABASE_URL") },
});
