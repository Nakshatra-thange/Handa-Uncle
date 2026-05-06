import { z } from "zod";

export const LineItemSchema = z.object({
  name: z.string().nullable(),
  amount: z.number().nullable(),
});

export const ReceiptFlagsSchema = z.object({
  merchant: z.literal("review").optional(),
  date: z.literal("review").optional(),
  total: z.literal("review").optional(),
  line_items: z.literal("review").optional(),
});

export const ParsedReceiptSchema = z.object({
  merchant: z.string().nullable(),
  date: z.string().nullable(),           
  line_items: z.array(LineItemSchema),
  subtotal: z.number().nullable(),
  discount: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number().nullable(),
  flags: ReceiptFlagsSchema,
  parse_warning: z.boolean().default(false),
});

export type LineItem = z.infer<typeof LineItemSchema>;
export type ReceiptFlags = z.infer<typeof ReceiptFlagsSchema>;
export type ParsedReceipt = z.infer<typeof ParsedReceiptSchema>;

// Shape the LLM is asked to return — no flags, no parse_warning
// We derive those ourselves after validation
export const LLMReceiptSchema = z.object({
  merchant: z.string().nullable(),
  date: z.string().nullable(),
  line_items: z.array(LineItemSchema),
  subtotal: z.number().nullable(),
  discount: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number().nullable(),
});

export type LLMReceipt = z.infer<typeof LLMReceiptSchema>;