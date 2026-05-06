import Anthropic from "@anthropic-ai/sdk";
import { LLMReceiptSchema, ParsedReceiptSchema } from "../schemas/reciept.ts";
import type { LLMReceipt, ParsedReceipt, ReceiptFlags } from "../schemas/reciept.ts";
import { PROMPT } from "./prompt.ts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractReceiptFromImage(imageBase64: string, mimeType: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: PROMPT,
          },
        ],
      },
    ],
  });

  const block = response.content.find((b:any) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text content returned from Claude");
  }

  return block.text;
}

// ─── Stage 2: Minimal JSON sanitation (not repair — sanitation) ──────────────

function sanitizeJson(raw: string): unknown {
  let text = raw.trim();

  // Strip markdown fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // Strip any leading/trailing non-JSON characters
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  // Remove trailing commas before } or ] (common LLM mistake)
  text = text.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(text);
}



function validateReceipt(raw: unknown): { data: LLMReceipt | null; parse_warning: boolean } {
  const result = LLMReceiptSchema.safeParse(raw);

  if (result.success) {
    return { data: result.data, parse_warning: false };
  }

  
  const partial: Partial<LLMReceipt> = {};
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate?.merchant === "string" || candidate?.merchant === null) {
    partial.merchant = candidate.merchant as string | null;
  }
  if (typeof candidate?.date === "string" || candidate?.date === null) {
    partial.date = candidate.date as string | null;
  }
  if (typeof candidate?.total === "number" || candidate?.total === null) {
    partial.total = candidate.total as number | null;
  }
  if (Array.isArray(candidate?.line_items)) {
    partial.line_items = (candidate.line_items as unknown[]).filter(
      (item: unknown): item is { name: string | null; amount: number | null } =>
        typeof item === "object" &&
        item !== null &&
        ("name" in item ? typeof (item as { name?: unknown }).name === "string" || (item as { name?: unknown }).name === null : true) &&
        ("amount" in item ? typeof (item as { amount?: unknown }).amount === "number" || (item as { amount?: unknown }).amount === null : true)
    );
  }

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


function deriveWarnings(data: LLMReceipt): ReceiptFlags {
  const flags: ReceiptFlags = {};

  if (!data.merchant) {
    flags.merchant = "review";
  }

  if (!data.date) {
    flags.date = "review";
  } else {
    const parsed = new Date(data.date);
    const isInvalidDate = isNaN(parsed.getTime());
    const isFutureDate = parsed > new Date();
    if (isInvalidDate || isFutureDate) {
      flags.date = "review";
    }
  }

  if (data.total === null) {
    flags.total = "review";
  }

  if (data.line_items.length === 0) {
    flags.line_items = "review";
  } else {
    const hasInvalidAmounts = data.line_items.some((item) => item.amount === null);
    if (hasInvalidAmounts) {
      flags.line_items = "review";
    }
  }

  return flags;
}


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
      merchant: null,
      date: null,
      line_items: [],
      subtotal: null,
      tax: null,
      tip: null,
      total: null,
      flags: {
        merchant: "review",
        date: "review",
        total: "review",
        line_items: "review",
      },
      parse_warning: true,
    };
    return ParsedReceiptSchema.parse(empty);
  }

  const { data, parse_warning } = validateReceipt(parsedJson);

  if (!data) {
    throw new Error("Could not recover any structured data from response");
  }

  const flags = deriveWarnings(data);

  return ParsedReceiptSchema.parse({
    ...data,
    flags,
    parse_warning,
  });
}