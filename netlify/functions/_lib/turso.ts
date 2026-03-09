import { createClient } from "@libsql/client/web";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || typeof url !== "string" || url.trim() === "") {
  throw new Error("TURSO_DATABASE_URL is not set or empty");
}
if (!authToken || typeof authToken !== "string" || authToken.trim() === "") {
  throw new Error("TURSO_AUTH_TOKEN is not set or empty");
}

export const turso = createClient({
  url: url.trim(),
  authToken: authToken.trim(),
});
