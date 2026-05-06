import { LLMReceiptSchema, ParsedReceiptSchema } from "../schemas/reciept";
import type { LLMReceipt, ParsedReceipt, ReceiptFlags } from "../schemas/reciept";
import { PROMPT } from "./prompt";

// OpenRouter — OpenAI-compatible API, no SDK needed
const MODEL = "baidu/qianfan-ocr-fast:free";

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set in environment");
  }
  return key;
}

// ─── Stage 1: Send image to OpenRouter, get raw text back ────────────────────

async function extractReceiptFromImage(imageBase64: string, mimeType: string): Promise<string> {
  const OPENROUTER_API_KEY = getOpenRouterKey();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "Receipt Parser"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            },
            {
              type: "text",
              text: PROMPT
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`OpenRouter: ${data.error.message}`);

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No content returned from model");

  return text;
}

// ─── Stage 2: Minimal JSON sanitation (not repair — sanitation) ──────────────

function sanitizeJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^`​`​`(?:json)?\s*/i, "").replace(/\s*`​`​`$/, "").trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  text = text.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(text);
}

// ─── Stage 3: Validate against Zod schema ───────────────────────────────────

function validateReceipt(raw: unknown): { data: LLMReceipt | null; parse_warning: boolean } {
  const result = LLMReceiptSchema.safeParse(raw);
  if (result.success) return { data: result.data, parse_warning: false };

  const partial: Partial<LLMReceipt> = {};
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate?.merchant === "string" || candidate?.merchant === null)
    partial.merchant = candidate.merchant as string | null;
  if (typeof candidate?.date === "string" || candidate?.date === null)
    partial.date = candidate.date as string | null;
  if (typeof candidate?.total === "number" || candidate?.total === null)
    partial.total = candidate.total as number | null;
  if (Array.isArray(candidate?.line_items))
    partial.line_items = candidate.line_items.filter(
      (item): item is { name: string | null; amount: number | null } =>
        typeof item === "object" && item !== null
    );

  const fallback: LLMReceipt = {
    merchant: partial.merchant ?? null,
    date: partial.date ?? null,
    line_items: partial.line_items ?? [],
    subtotal: null,
    tax: null,
    tip: null,
    total: partial.total ?? null,
  };

  return { data: fallback, parse_warning: true };
}

// ─── Stage 4: Derive review flags from heuristics ───────────────────────────

function deriveWarnings(data: LLMReceipt): ReceiptFlags {
  const flags: ReceiptFlags = {};

  if (!data.merchant) flags.merchant = "review";

  if (!data.date) {
    flags.date = "review";
  } else {
    const parsed = new Date(data.date);
    if (isNaN(parsed.getTime()) || parsed > new Date()) flags.date = "review";
  }

  if (data.total === null) flags.total = "review";

  if (data.line_items.length === 0) {
    flags.line_items = "review";
  } else if (data.line_items.some((item) => item.amount === null)) {
    flags.line_items = "review";
  }

  return flags;
}

// ─── Public entrypoint ───────────────────────────────────────────────────────

export async function parseReceiptImage(
  imageBase64: string,
  mimeType: string
): Promise<ParsedReceipt> {
  const rawText = await extractReceiptFromImage(imageBase64, mimeType);

  let parsedJson: unknown;
  try {
    parsedJson = sanitizeJson(rawText);
  } catch {
    const empty: ParsedReceipt = {
      merchant: null, date: null, line_items: [],
      subtotal: null, tax: null, tip: null, total: null,
      flags: { merchant: "review", date: "review", total: "review", line_items: "review" },
      parse_warning: true,
    };
    return ParsedReceiptSchema.parse(empty);
  }

  const { data, parse_warning } = validateReceipt(parsedJson);
  if (!data) throw new Error("Could not recover any structured data from response");

  const flags = deriveWarnings(data);
  return ParsedReceiptSchema.parse({ ...data, flags, parse_warning });
}