import { config } from "dotenv";
import path from "path";

// Load .env.test and set DATABASE_URL
config({ path: path.resolve(process.cwd(), ".env.test") });

// Explicitly map DATABASE_URL_TEST to DATABASE_URL if needed
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
