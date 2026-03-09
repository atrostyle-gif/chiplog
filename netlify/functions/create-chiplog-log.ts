import type { Handler } from "@netlify/functions";
import { turso } from "./_lib/turso";

const UPSERT_SQL = `
INSERT INTO chiplog_logs (
  id, date, author_name, company_name, product_name, part_number,
  internal_number, material_name, chip_id, rpm, feed, doc, memo,
  created_at, updated_at
) VALUES (
  :id, :date, :author_name, :company_name, :product_name, :part_number,
  :internal_number, :material_name, :chip_id, :rpm, :feed, :doc, :memo,
  :created_at, :updated_at
)
ON CONFLICT(id) DO UPDATE SET
  date = excluded.date,
  author_name = excluded.author_name,
  company_name = excluded.company_name,
  product_name = excluded.product_name,
  part_number = excluded.part_number,
  internal_number = excluded.internal_number,
  material_name = excluded.material_name,
  chip_id = excluded.chip_id,
  rpm = excluded.rpm,
  feed = excluded.feed,
  doc = excluded.doc,
  memo = excluded.memo,
  updated_at = excluded.updated_at
`.trim();

const jsonHeaders = { "Content-Type": "application/json" };

function badRequest(message: string) {
  return {
    statusCode: 400,
    headers: jsonHeaders,
    body: JSON.stringify({ success: false, error: message }),
  };
}

function methodNotAllowed() {
  return {
    statusCode: 405,
    headers: jsonHeaders,
    body: JSON.stringify({ success: false, error: "Method Not Allowed" }),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed();
  }

  let body: Record<string, unknown>;
  try {
    const raw = event.body;
    if (!raw || raw.trim() === "") {
      return badRequest("Request body is empty");
    }
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const created_at = typeof body.created_at === "string" ? body.created_at.trim() : "";
  const updated_at = typeof body.updated_at === "string" ? body.updated_at.trim() : "";

  if (!id) return badRequest("id is required");
  if (!date) return badRequest("date is required");
  if (!created_at) return badRequest("created_at is required");
  if (!updated_at) return badRequest("updated_at is required");

  const author_name = body.author_name != null && body.author_name !== "" ? String(body.author_name) : null;
  const company_name = body.company_name != null && body.company_name !== "" ? String(body.company_name) : null;
  const product_name = body.product_name != null && body.product_name !== "" ? String(body.product_name) : null;
  const part_number = body.part_number != null && body.part_number !== "" ? String(body.part_number) : null;
  const internal_number = body.internal_number != null && body.internal_number !== "" ? String(body.internal_number) : null;
  const material_name = body.material_name != null && body.material_name !== "" ? String(body.material_name) : null;
  const chip_id = body.chip_id != null && body.chip_id !== "" ? String(body.chip_id) : null;
  const rpm = typeof body.rpm === "number" && !Number.isNaN(body.rpm) ? body.rpm : null;
  const feed = typeof body.feed === "number" && !Number.isNaN(body.feed) ? body.feed : null;
  const doc = typeof body.doc === "number" && !Number.isNaN(body.doc) ? body.doc : null;
  const memo = body.memo != null && body.memo !== "" ? String(body.memo) : null;

  try {
    await turso.execute({
      sql: UPSERT_SQL,
      args: {
        id,
        date,
        author_name,
        company_name,
        product_name,
        part_number,
        internal_number,
        material_name,
        chip_id,
        rpm,
        feed,
        doc,
        memo,
        created_at,
        updated_at,
      },
    });
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ success: true, id }),
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
