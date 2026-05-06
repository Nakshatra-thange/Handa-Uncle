import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import dotenv from "dotenv";

dotenv.config();

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({
    message: "Receipt Parser API running",
  });
});

serve({
  fetch: app.fetch,
  port: 3001,
});

console.log("Server running on http://localhost:3001");