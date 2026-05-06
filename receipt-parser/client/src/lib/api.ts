const BASE = "http://localhost:3000";

export interface LineItem {
  name: string | null;
  amount: number | null;
}

export interface ReceiptFlags {
  merchant?: "review";
  date?: "review";
  total?: "review";
  line_items?: "review";
}

export interface ParsedReceipt {
  id: number;
  image_path: string;
  merchant: string | null;
  date: string | null;
  line_items: LineItem[];
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number | null;
  flags: ReceiptFlags;
  parse_warning: boolean;
}

export interface ReceiptListItem {
  id: number;
  image_path: string;
  created_at: string;
  merchant: string | null;
  date: string | null;
  total: number | null;
}

export async function uploadAndParse(file: File): Promise<ParsedReceipt> {
  const form = new FormData();
  form.append("image", file);

  const res = await fetch(`${BASE}/parse`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Parse failed");
  }
  return res.json();
}

export async function saveCorrection(
  id: number,
  data: Omit<ParsedReceipt, "id" | "image_path" | "parse_warning">
): Promise<void> {
  const res = await fetch(`${BASE}/receipts/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Save failed");
}

export async function listReceipts(): Promise<ReceiptListItem[]> {
  const res = await fetch(`${BASE}/receipts`);
  if (!res.ok) throw new Error("Failed to load receipts");
  return res.json();
}

export async function getReceipt(id: number): Promise<ParsedReceipt> {
  const res = await fetch(`${BASE}/receipts/${id}`);
  if (!res.ok) throw new Error("Receipt not found");
  return res.json();
}

export function imageUrl(path: string) {
  return `${BASE}/${path}`;
}