import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { turso } from "./_lib/turso";

const STORE_NAME = "chiplog-chip-images";
const UPSERT_IMAGE_URL_SQL = `
INSERT INTO chiplog_chip_images (chip_id, image_url, updated_at)
VALUES (:chip_id, :image_url, :updated_at)
ON CONFLICT(chip_id) DO UPDATE SET
  image_url = excluded.image_url,
  updated_at = excluded.updated_at
`.trim();
const jsonHeaders = { "Content-Type": "application/json" };

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

function serverError(message: string) {
  return {
    statusCode: 500,
    headers: jsonHeaders,
    body: JSON.stringify({ success: false, error: message }),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed();
  }

  let body: { chipId?: string; data?: string; contentType?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  const chipId = typeof body.chipId === "string" ? body.chipId.trim() : "";
  const data = body.data;
  const contentType = typeof body.contentType === "string" ? body.contentType : "image/jpeg";

  if (!chipId) {
    return badRequest("chipId is required");
  }
  if (typeof data !== "string" || !data) {
    return badRequest("data (base64 image) is required");
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(data, "base64");
  } catch {
    return badRequest("data must be valid base64");
  }

  if (buffer.length > 5 * 1024 * 1024) {
    return badRequest("Image size must be under 5MB");
  }

  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;

  if (!siteID) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: false,
        error: "NETLIFY_SITE_ID is missing",
      }),
    };
  }

  if (!token) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: false,
        error: "NETLIFY_BLOBS_TOKEN is missing",
      }),
    };
  }

  const store = getStore({
    name: STORE_NAME,
    consistency: "strong",
    siteID,
    token,
  });

  const ext = contentType.includes("png") ? "png" : "jpg";
  const key = `chips/${chipId}/${Date.now()}.${ext}`;

  try {
    const arrayBuffer = new Uint8Array(buffer).buffer as ArrayBuffer;
    await store.set(key, arrayBuffer, {
      metadata: { contentType },
    });
  } catch (err) {
    console.error("Blobs set error:", err);
    return serverError(
      err instanceof Error ? err.message : "Failed to store image"
    );
  }

  const baseUrl =
    process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:8888";
  const imageUrl = `${baseUrl}/.netlify/functions/serve-chip-image?key=${encodeURIComponent(key)}`;

  const now = new Date().toISOString();
  try {
    await turso.execute({
      sql: UPSERT_IMAGE_URL_SQL,
      args: { chip_id: chipId, image_url: imageUrl, updated_at: now },
    });
  } catch (tursoErr) {
    console.error("Turso upsert chip image URL error:", tursoErr);
    return serverError(
      tursoErr instanceof Error ? tursoErr.message : "Failed to save image URL"
    );
  }

  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({ success: true, imageUrl }),
  };
};
