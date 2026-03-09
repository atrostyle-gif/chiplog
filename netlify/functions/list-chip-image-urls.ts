import type { Handler } from "@netlify/functions";
import { turso } from "./_lib/turso";

const jsonHeaders = { "Content-Type": "application/json" };

const SELECT_SQL = `
SELECT chip_id, image_url, updated_at
FROM chiplog_chip_images
ORDER BY updated_at DESC
`.trim();

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
    const result = await turso.execute(SELECT_SQL);
    const rows = result.rows as unknown as Array<{
      chip_id: string;
      image_url: string | null;
      updated_at: string;
    }>;
    const items = rows.map((r) => {
      const raw = r.image_url;
      const image_url =
        raw != null && typeof raw === "string" && raw.trim() !== ""
          ? raw.trim()
          : null;
      return { chip_id: r.chip_id, image_url, updated_at: r.updated_at };
    });
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ success: true, items }),
    };
  } catch (err) {
    console.error("list-chip-image-urls error:", err);
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
