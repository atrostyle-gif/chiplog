import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "chiplog-chip-images";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const key = event.queryStringParameters?.key;
  if (!key) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "key is required" }),
    };
  }

  try {
    const store = getStore({
      name: STORE_NAME,
      consistency: "strong",
    });
    const blob = await store.get(key, { type: "arrayBuffer" });
    if (!blob) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "text/plain" },
        body: "Not found",
      };
    }

    const contentType =
      key.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    };
    return {
      statusCode: 200,
      headers,
      body: Buffer.from(blob as ArrayBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("serve-chip-image error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
    };
  }
};
