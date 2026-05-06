import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(process.cwd(), "data/receipts.db");
const UPLOADS_PATH = path.resolve(process.cwd(), "uploads");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOADS_PATH, { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS receipts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path  TEXT NOT NULL,
    raw_llm_json    TEXT NOT NULL,
    parsed_json     TEXT NOT NULL,
    corrected_json  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);


export interface ReceiptRow {
  id: number;
  image_path: string;
  raw_llm_json: string;
  parsed_json: string;
  corrected_json: string | null;
  created_at: string;
}

export interface ReceiptListItem {
  id: number;
  image_path: string;
  created_at: string;
  merchant: string | null;
  date: string | null;
  total: number | null;
}


const stmtInsert = db.prepare(`
  INSERT INTO receipts (image_path, raw_llm_json, parsed_json)
  VALUES (@image_path, @raw_llm_json, @parsed_json)
`);

const stmtUpdateCorrected = db.prepare(`
  UPDATE receipts SET corrected_json = @corrected_json WHERE id = @id
`);

const stmtGetById = db.prepare<[number]>(`
  SELECT * FROM receipts WHERE id = ?
`);

const stmtGetAll = db.prepare(`
  SELECT id, image_path, created_at, parsed_json, corrected_json
  FROM receipts
  ORDER BY created_at DESC
`);


export function insertReceipt(params: {
  image_path: string;
  raw_llm_json: string;
  parsed_json: string;
}): number {
  const result = stmtInsert.run(params);
  return result.lastInsertRowid as number;
}

export function saveCorrection(id: number, correctedJson: string): void {
  stmtUpdateCorrected.run({ id, corrected_json: correctedJson });
}

export function getReceiptById(id: number): ReceiptRow | undefined {
  return stmtGetById.get(id) as ReceiptRow | undefined;
}

export function listReceipts(): ReceiptListItem[] {
  const rows = stmtGetAll.all() as Array<{
    id: number;
    image_path: string;
    created_at: string;
    parsed_json: string;
    corrected_json: string | null;
  }>;

  return rows.map((row) => {
    const display = row.corrected_json
      ? JSON.parse(row.corrected_json)
      : JSON.parse(row.parsed_json);

    return {
      id: row.id,
      image_path: row.image_path,
      created_at: row.created_at,
      merchant: display.merchant ?? null,
      date: display.date ?? null,
      total: display.total ?? null,
    };
  });
}

export { UPLOADS_PATH };
export default db;