import { db } from "./db";
import type { LogEntity, LogSearchFilters } from "./db";
export type { LogEntity, CloudSyncStatus } from "./db";
import { addMaterial } from "./materialStore";
import { addPerson } from "./peopleStore";
import { loadLogs } from "../data/logs";

const MIGRATION_FLAG = "chiplog_migrated_to_dexie";

function matchesKeyword(log: LogEntity, q: string): boolean {
  const lower = q.toLowerCase();
  const fields = [
    log.company,
    log.productName,
    log.productNo,
    log.internalSerial,
    log.memo,
  ];
  return fields.some((f) => String(f).toLowerCase().includes(lower));
}

export async function searchLogs(filters: LogSearchFilters): Promise<LogEntity[]> {
  const collection = db.logs.orderBy("date").reverse();
  const logs = await collection.toArray();

  let result = logs;

  if (filters.keyword?.trim()) {
    const q = filters.keyword.trim().toLowerCase();
    result = result.filter((log) => matchesKeyword(log, q));
  }
  if (filters.materialId) {
    result = result.filter((log) => log.materialId === filters.materialId);
  }
  if (filters.writerId) {
    result = result.filter((log) => log.writerId === filters.writerId);
  }
  if (filters.chipId) {
    result = result.filter((log) => log.chipId === filters.chipId);
  }
  if (filters.dateFrom) {
    result = result.filter((log) => log.date >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    result = result.filter((log) => log.date <= filters.dateTo!);
  }

  result.sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return result;
}

export type LogInsert = Omit<
  LogEntity,
  "id" | "createdAt" | "updatedAt" | "cloudSyncStatus" | "cloudSyncedAt" | "cloudSyncErrorMessage"
>;

export async function addLog(entry: LogInsert): Promise<LogEntity> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const entity: LogEntity = {
    ...entry,
    id,
    createdAt: now,
    updatedAt: now,
    cloudSyncStatus: "local_only",
    cloudSyncedAt: null,
    cloudSyncErrorMessage: null,
  };
  await db.logs.add(entity);
  return entity;
}

export async function updateLog(id: string, entry: LogInsert): Promise<void> {
  const existing = await db.logs.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.logs.put({
    ...entry,
    id,
    createdAt: existing.createdAt,
    updatedAt: now,
    cloudSyncStatus: "local_only",
    cloudSyncedAt: null,
    cloudSyncErrorMessage: null,
  });
}

export async function updateLogCloudSyncStatus(
  id: string,
  status: "synced" | "sync_error",
  cloudSyncedAt: string | null,
  cloudSyncErrorMessage: string | null
): Promise<void> {
  const existing = await db.logs.get(id);
  if (!existing) return;
  await db.logs.update(id, {
    cloudSyncStatus: status,
    cloudSyncedAt,
    cloudSyncErrorMessage,
  });
}

export async function deleteLog(id: string): Promise<void> {
  await db.logs.delete(id);
}

export async function getLogById(id: string): Promise<LogEntity | undefined> {
  return db.logs.get(id);
}

/** クラウド未同期のログ一覧（local_only / sync_error）。再送用。 */
export async function getPendingCloudSyncLogs(): Promise<LogEntity[]> {
  const all = await db.logs.toArray();
  return all.filter(
    (log) =>
      log.cloudSyncStatus === "local_only" || log.cloudSyncStatus === "sync_error"
  );
}

export async function migrateFromLocalStorage(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
    const oldLogs = loadLogs();
    if (oldLogs.length === 0) {
      localStorage.setItem(MIGRATION_FLAG, "1");
      return;
    }

    const materialByName = new Map<string, string>();
    const ensureMaterial = async (name: string): Promise<string> => {
      const n = name.trim() || "（不明）";
      const id = materialByName.get(n);
      if (id) return id;
      const mat = await addMaterial(n);
      materialByName.set(n, mat.id);
      return mat.id;
    };

    let migrationPersonId: string;
    const existingPeople = await db.people.toArray();
    const migrated = existingPeople.find((p) => p.name === "（移行）");
    if (migrated) {
      migrationPersonId = migrated.id;
    } else {
      const p = await addPerson("（移行）");
      migrationPersonId = p.id;
    }

    const now = new Date().toISOString();
    for (const old of oldLogs) {
      const materialId = await ensureMaterial(old.material);
      const mat = await db.materials.get(materialId);
      const materialName = mat?.name ?? old.material;
      await db.logs.add({
        id: old.id,
        date: old.date || now.slice(0, 10),
        chipId: old.chip,
        materialId,
        materialName,
        writerId: migrationPersonId,
        writerName: "（移行）",
        company: "",
        productName: "",
        productNo: "",
        internalSerial: "",
        rpm: old.rpm,
        feed: old.feed,
        doc: old.doc,
        memo: old.memo ?? "",
        iso: old.iso,
        createdAt: now,
        updatedAt: now,
        cloudSyncStatus: "local_only",
        cloudSyncedAt: null,
        cloudSyncErrorMessage: null,
      });
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    // 移行失敗時もアプリは継続
  }
}

const CLOUD_SYNC_STATUS_MIGRATION_FLAG = "chiplog_cloud_sync_status_migrated";

/** 既存ログに cloudSyncStatus を付与する（未設定なら local_only） */
export async function ensureCloudSyncStatusMigration(): Promise<void> {
  if (localStorage.getItem(CLOUD_SYNC_STATUS_MIGRATION_FLAG) === "1") return;
  try {
    const all = await db.logs.toArray();
    for (const log of all) {
      if (log.cloudSyncStatus === undefined) {
        await db.logs.update(log.id, {
          cloudSyncStatus: "local_only",
          cloudSyncedAt: null,
          cloudSyncErrorMessage: null,
        });
      }
    }
    localStorage.setItem(CLOUD_SYNC_STATUS_MIGRATION_FLAG, "1");
  } catch {
    // 失敗時もアプリは継続
  }
}
