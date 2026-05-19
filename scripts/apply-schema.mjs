import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function splitSqlStatements(sqlText) {
  return sqlText
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Run `vercel env pull .env.local` first.");
  process.exitCode = 1;
} else {
  const schemaPath = resolve(process.cwd(), "db/schema.sql");
  const statements = splitSqlStatements(readFileSync(schemaPath, "utf8"));
  const sql = neon(process.env.DATABASE_URL);

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log(`Applied ${statements.length} schema statements from db/schema.sql.`);
}
