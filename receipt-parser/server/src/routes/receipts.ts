import { Hono } from "hono";
import {
  saveCorrection,
  getReceiptById,
  listReceipts,
} from "../db/database";

const receiptsRoute = new Hono();

// GET /receipts — list all saved receipts (summary view)
receiptsRoute.get("/", (c) => {
  const receipts = listReceipts();
  return c.json(receipts);
});

// GET /receipts/:id — full receipt data for edit view
receiptsRoute.get("/:id", (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "Invalid receipt id" }, 400);
  }

  const row = getReceiptById(id);

  if (!row) {
    return c.json({ error: "Receipt not found" }, 404);
  }

  // Return corrected data if it exists, otherwise parsed
  const data = row.corrected_json
    ? JSON.parse(row.corrected_json)
    : JSON.parse(row.parsed_json);

  return c.json({
    id: row.id,
    image_path: row.image_path,
    created_at: row.created_at,
    has_correction: row.corrected_json !== null,
    ...data,
  });
});

// POST /receipts/:id — save corrected receipt data
receiptsRoute.post("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "Invalid receipt id" }, 400);
  }

  const row = getReceiptById(id);

  if (!row) {
    return c.json({ error: "Receipt not found" }, 404);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  saveCorrection(id, JSON.stringify(body));

  return c.json({ ok: true, id });
});

export default receiptsRoute;