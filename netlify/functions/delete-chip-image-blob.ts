import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "chiplog-chip-images";

/** 自 store で発行した key のみ許可: chips/<chipId>/<suffix> */
const VALID_KEY_REGEX = /^chips\/[^/]+\/.+$/;

const jsonHeaders = { "Content-Type": "application/json" };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ success: false, error: "Method Not Allowed" }),
    };
  }

  let body: { key?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ success: false, error: "Invalid JSON body" }),
    };
  }

  const key =
    typeof body.key === "string" ? body.key.trim() : "";
  if (!key || !VALID_KEY_REGEX.test(key)) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: false,
        error: "key must match chips/<chipId>/<suffix>",
      }),
    };
  }

  try {
    const store = getStore({
      name: STORE_NAME,
      consistency: "strong",
    });
    await store.delete(key);
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("delete-chip-image-blob error:", err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Delete failed",
      }),
    };
  }
};
