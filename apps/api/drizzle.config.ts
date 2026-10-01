// Drizzle Kit: writes the SQL migrations in drizzle/ from the schema files.
//   npm run db:generate -w @cdr/api      after changing a *.schema.ts file
// The API applies them itself on start (src/core/db.ts); commit the generated files.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/features/**/*.schema.ts",
  out: "./drizzle",
});
