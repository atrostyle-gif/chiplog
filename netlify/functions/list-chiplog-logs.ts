import type { Handler } from "@netlify/functions";
import { turso } from "./_lib/turso";

const LIST_SQL = `
SELECT
  id, date, author_name, company_name, product_name, part_number,
  internal_number, material_name, chip_id, rpm, feed, doc, memo,
  created_at, updated_at
FROM chiplog_logs
ORDER BY date DESC, updated_at DESC
`.trim();

const jsonHeaders = { "Content-Type": "application/json" };

function methodNotAllowed() {
  return {
    statusCode: 405,
    headers: jsonHeaders,
    body: JSON.stringify({ success: false, error: "Method Not Allowed" }),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed();
  }

  try {
    const result = await turso.execute(LIST_SQL);
    const rows = result.rows;
    const items = rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id,
        date: r.date,
        author_name: r.author_name ?? null,
        company_name: r.company_name ?? null,
        product_name: r.product_name ?? null,
        part_number: r.part_number ?? null,
        internal_number: r.internal_number ?? null,
        material_name: r.material_name ?? null,
        chip_id: r.chip_id ?? null,
        rpm: r.rpm ?? null,
        feed: r.feed ?? null,
        doc: r.doc ?? null,
        memo: r.memo ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ success: true, items }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ success: false, error: message }),
    };
  }
};
