import type { Handler } from "@netlify/functions";
import { turso } from "./_lib/turso";

const CREATE_LOGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS chiplog_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  author_name TEXT,
  company_name TEXT,
  product_name TEXT,
  part_number TEXT,
  internal_number TEXT,
  material_name TEXT,
  chip_id TEXT,
  rpm REAL,
  feed REAL,
  doc REAL,
  memo TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
`.trim();

const DROP_CHIP_IMAGES_TABLE_SQL = "DROP TABLE IF EXISTS chiplog_chip_images";

const CREATE_CHIP_IMAGES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS chiplog_chip_images (
  chip_id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
`.trim();

export const handler: Handler = async () => {
  try {
    await turso.execute(CREATE_LOGS_TABLE_SQL);
    await turso.execute(DROP_CHIP_IMAGES_TABLE_SQL);
    await turso.execute(CREATE_CHIP_IMAGES_TABLE_SQL);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        tables: ["chiplog_logs", "chiplog_chip_images"],
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: message }),
    };
  }
};
