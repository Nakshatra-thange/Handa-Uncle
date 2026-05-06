import { Hono } from "hono";
import path from "path";
import fs from "fs/promises";
import { parseReceiptImage } from "../services/parseReceipt.ts";
import { insertReceipt, UPLOADS_PATH } from "../db/database.ts";

const parseRoute = new Hono();

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadFile = {
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function asUploadFile(value: unknown): UploadFile | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== "string") return null;
  if (typeof v.arrayBuffer !== "function") return null;
  return value as UploadFile;
}

parseRoute.post("/", async (c) => {
  const body = await c.req.parseBody();
  const maybeImage = body["image"];

  const file = Array.isArray(maybeImage)
    ? (maybeImage.map(asUploadFile).find((v): v is UploadFile => v !== null) ?? null)
    : asUploadFile(maybeImage);

  if (!file) {
    return c.json({ error: "No image file provided" }, 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json({ error: "Only JPEG, PNG, and WebP images are supported" }, 400);
  }

  // Save uploaded file to disk
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(UPLOADS_PATH, filename);
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, imageBuffer);

  // Convert to base64 for Claude vision API
  const imageBase64 = imageBuffer.toString("base64");

  let parsed;
  try {
    parsed = await parseReceiptImage(imageBase64, file.type);
  } catch (err) {
    console.error("Parse pipeline failed:", err);
    return c.json({ error: "Failed to extract receipt data" }, 502);
  }

  // Store raw LLM response and parsed result separately — enables future prompt eval
  const receiptId = insertReceipt({
    image_path: `uploads/${filename}`,
    raw_llm_json: JSON.stringify(parsed),   // after sanitation but before flag derivation would be ideal; this is pragmatic
    parsed_json: JSON.stringify(parsed),
  });

  return c.json({
    id: receiptId,
    ...parsed,
    image_path: `uploads/${filename}`,
  });
});

export default parseRoute;