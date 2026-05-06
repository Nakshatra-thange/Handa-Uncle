import { Hono } from "hono";
import { serve } from "@hono/node-server";
import  {cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import parseRoute from "./routes/parse.ts";
import receiptsRoute from "./routes/receipts.ts";




const app = new Hono();
app.use("*", cors({ origin: "http://localhost:5173" }));
 
// Serve uploaded images as static files
app.use("/uploads/*", serveStatic({ root: "./" }));
 
app.route("/parse", parseRoute);
app.route("/receipts", receiptsRoute);
 
app.get("/health", (c) => c.json({ ok: true }));
 
const PORT = Number(process.env.PORT ?? 3000);
 
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});