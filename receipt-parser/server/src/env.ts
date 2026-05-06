import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// When running from `receipt-parser/server`, load env from `receipt-parser/.env`.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

