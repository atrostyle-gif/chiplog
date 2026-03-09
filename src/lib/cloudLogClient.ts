import type { LogEntity } from "./logStore";

const CREATE_LOG_URL = "/.netlify/functions/create-chiplog-log";
const LIST_LOGS_URL = "/.netlify/functions/list-chiplog-logs";

export interface CloudLogItem {
  id: string;
  date: string | null;
  author_name: string | null;
  company_name: string | null;
  product_name: string | null;
  part_number: string | null;
  internal_number: string | null;
  material_name: string | null;
  chip_id: string | null;
  rpm: number | null;
  feed: number | null;
  doc: number | null;
  memo: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type FetchCloudLogsResult =
  | { ok: true; items: CloudLogItem[] }
  | { ok: false; error: string };

/**
 * Turso に保存されたログ一覧を取得する。
 */
export async function fetchCloudLogs(): Promise<FetchCloudLogsResult> {
  try {
    const res = await fetch(LIST_LOGS_URL, { method: "GET" });
    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
      items?: CloudLogItem[];
    };
    if (!res.ok || data.success !== true) {
      const msg =
        typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const items = Array.isArray(data.items) ? data.items : [];
    return { ok: true, items };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

function mapLogToApiBody(entity: LogEntity): Record<string, unknown> {
  return {
    id: entity.id,
    date: entity.date,
    author_name: entity.writerName || null,
    company_name: entity.company || null,
    product_name: entity.productName || null,
    part_number: entity.productNo || null,
    internal_number: entity.internalSerial || null,
    material_name: entity.materialName || null,
    chip_id: entity.chipId || null,
    rpm: entity.rpm,
    feed: entity.feed,
    doc: entity.doc,
    memo: entity.memo || null,
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
  };
}

export type SyncLogResult = { ok: true } | { ok: false; error: string };

/**
 * ログを Netlify Function 経由で Turso に送信する。
 * token 等はフロントに持たない。
 */
export async function syncLogToCloud(entity: LogEntity): Promise<SyncLogResult> {
  const body = mapLogToApiBody(entity);
  try {
    const res = await fetch(CREATE_LOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (res.ok && data.success === true) return { ok: true };
    const msg = typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    return { ok: false, error: msg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
