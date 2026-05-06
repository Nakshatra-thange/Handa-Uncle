import { LLMReceiptSchema, ParsedReceiptSchema } from "../schemas/reciept";
import type {
  LLMReceipt,
  ParsedReceipt,
  ReceiptFlags,
} from "../schemas/reciept";

import { PROMPT } from "./prompt";

const MODEL = "baidu/qianfan-ocr-fast:free";

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();

  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  return key;
}

async function extractReceiptFromImage(
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const apiKey = getOpenRouterKey();

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Receipt Parser",
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
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },

              {
                type: "text",
                text: PROMPT,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();

    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };

  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No content returned from model");
  }

  return text;
}

function sanitizeJson(raw: string): unknown {
  let text = raw.trim();

  text = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  text = text.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(text);
}

function validateReceipt(raw: unknown): {
  data: LLMReceipt | null;
  parse_warning: boolean;
} {
  const result = LLMReceiptSchema.safeParse(raw);

  if (result.success) {
    return {
      data: result.data,
      parse_warning: false,
    };
  }

  const partial: Partial<LLMReceipt> = {};

  const candidate = raw as Record<string, unknown>;

  if (
    typeof candidate?.merchant === "string" ||
    candidate?.merchant === null
  ) {
    partial.merchant = candidate.merchant as string | null;
  }

  if (
    typeof candidate?.date === "string" ||
    candidate?.date === null
  ) {
    partial.date = candidate.date as string | null;
  }

  if (
    typeof candidate?.total === "number" ||
    candidate?.total === null
  ) {
    partial.total = candidate.total as number | null;
  }

  if (
    typeof candidate?.discount === "number" ||
    candidate?.discount === null
  ) {
    partial.discount = candidate.discount as number | null;
  }

  if (Array.isArray(candidate?.line_items)) {
    partial.line_items = candidate.line_items.filter(
      (
        item
      ): item is {
        name: string | null;
        amount: number | null;
      } =>
        typeof item === "object" &&
        item !== null &&
        ("name" in item || "amount" in item)
    );
  }

  const fallback: LLMReceipt = {
    merchant: partial.merchant ?? null,
    date: partial.date ?? null,

    line_items: partial.line_items ?? [],

    subtotal: null,
    discount: partial.discount ?? null,
    tax: null,
    tip: null,
    total: partial.total ?? null,
  };

  return {
    data: fallback,
    parse_warning: true,
  };
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

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const invalidDate = isNaN(parsed.getTime());
    const futureDate = parsed > now;

    if (invalidDate || futureDate) {
      flags.date = "review";
    }
  }

  if (data.total === null) {
    flags.total = "review";
  }

  if (data.line_items.length === 0) {
    flags.line_items = "review";
  } else {
    const hasInvalidAmounts = data.line_items.some(
      (item) => item.amount === null
    );

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
  const rawText = await extractReceiptFromImage(
    imageBase64,
    mimeType
  );

  let parsedJson: unknown;

  try {
    parsedJson = sanitizeJson(rawText);
  } catch {
    const empty: ParsedReceipt = {
      merchant: null,
      date: null,

      line_items: [],

      subtotal: null,
      discount: null,
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

  const { data, parse_warning } =
    validateReceipt(parsedJson);

  if (!data) {
    throw new Error(
      "Could not recover structured receipt data"
    );
  }

  const flags = deriveWarnings(data);

  return ParsedReceiptSchema.parse({
    ...data,
    flags,
    parse_warning,
  });
}