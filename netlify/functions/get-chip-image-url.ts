import type { Handler } from "@netlify/functions";
import { turso } from "./_lib/turso";

const jsonHeaders = { "Content-Type": "application/json" };

const SELECT_SQL = `
SELECT image_url FROM chiplog_chip_images WHERE chip_id = :chip_id
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
  if (event.httpMethod !== "GET") {
    return methodNotAllowed();
  }

  const chipId = event.queryStringParameters?.chip_id?.trim();
  if (!chipId) {
    return badRequest("chip_id is required");
  }

  try {
    const result = await turso.execute({
      sql: SELECT_SQL,
      args: { chip_id: chipId },
    });
    const rows = result.rows as unknown as Array<{ image_url: string | null }>;
    const raw = rows[0]?.image_url;
    const imageUrl =
      raw != null && typeof raw === "string" && raw.trim() !== ""
        ? raw.trim()
        : null;
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        image_url: imageUrl,
      }),
    };
  } catch (err) {
    console.error("get-chip-image-url error:", err);
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
