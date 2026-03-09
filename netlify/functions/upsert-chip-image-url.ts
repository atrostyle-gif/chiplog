import type { Handler } from "@netlify/functions";
import { turso } from "./_lib/turso";

const jsonHeaders = { "Content-Type": "application/json" };

const UPSERT_SQL = `
INSERT INTO chiplog_chip_images (chip_id, image_url, updated_at)
VALUES (:chip_id, :image_url, :updated_at)
ON CONFLICT(chip_id) DO UPDATE SET
  image_url = excluded.image_url,
  updated_at = excluded.updated_at
`.trim();

function methodNotAllowed() {
  return {
    statusCode: 405,
    headers: jsonHeaders,
    body: JSON.stringify({ success: false, error: "Method Not Allowed" }),
  };
}

function badRequest(message: string) {
  return {
    statusCode: 400,
    headers: jsonHeaders,
    body: JSON.stringify({ success: false, error: message }),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed();
  }

  let body: { chip_id?: string; image_url?: string | null };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  const chipId =
    typeof body.chip_id === "string" ? body.chip_id.trim() : "";
  const raw = body.image_url;
  const imageUrl =
    raw == null || typeof raw !== "string" || raw.trim() === ""
      ? null
      : raw.trim();

  if (!chipId) {
    return badRequest("chip_id is required");
  }

  const now = new Date().toISOString();

  try {
    await turso.execute({
      sql: UPSERT_SQL,
      args: {
        chip_id: chipId,
        image_url: imageUrl,
        updated_at: now,
      },
    });
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ success: true, chip_id: chipId }),
    };
  } catch (err) {
    console.error("upsert-chip-image-url error:", err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
    };
  }
};
