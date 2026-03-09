import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "chiplog-chip-images";
const jsonHeaders = { "Content-Type": "application/json" };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const key = event.queryStringParameters?.key;
  if (!key) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "key is required" }),
    };
  }

  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;

  console.log("SERVE BLOBS ENV CHECK", {
    hasSiteID: !!siteID,
    siteIDPrefix: siteID ? siteID.slice(0, 8) : null,
    hasToken: !!token,
    tokenPrefix: token ? token.slice(0, 5) : null,
  });

  if (!siteID) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "NETLIFY_SITE_ID is missing" }),
    };
  }
  if (!token) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "NETLIFY_BLOBS_TOKEN is missing" }),
    };
  }

  try {
    const store = getStore({
      name: STORE_NAME,
      consistency: "strong",
      siteID,
      token,
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
      headers: jsonHeaders,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
    };
  }
};
