import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getChipById, chips } from "../data/chips";
import {
  listMaterials,
  addMaterial,
  type MaterialEntity,
} from "../lib/materialStore";
import {
  listPeople,
  addPerson,
  type PersonEntity,
} from "../lib/peopleStore";
import {
  searchLogs,
  addLog,
  updateLog,
  deleteLog,
  getLogById,
  updateLogCloudSyncStatus,
  getPendingCloudSyncLogs,
  ensureCloudSyncStatusMigration,
  migrateFromLocalStorage,
  type LogEntity,
  type LogInsert,
} from "../lib/logStore";
import {
  syncLogToCloud,
  fetchCloudLogs,
  type CloudLogItem,
} from "../lib/cloudLogClient";
import { runSeedMaterialsIfNeeded } from "../lib/seedMaterials";
import { runSeedVNBR_PR930_IfNeeded } from "../lib/seedVNBR_PR930";
import {
  searchCompanies,
  addCompany,
  touchCompany,
  type CompanyEntity,
} from "../lib/companyStore";
import {
  MATERIAL_ISO_OPTIONS,
  ISO_LABEL,
  type MaterialISO,
} from "../lib/conditionStore";
import {
  getBestCatalogRecommendation,
  type CatalogRecommendationEntity,
} from "../lib/catalogRecommendationStore";
import { ensureCatalogRecommendationsSeeded } from "../lib/seedCatalogRecommendations";
import { inferCatalogBreakerKeyFromModel } from "../lib/catalogKey";
import {
  SAVE_FAILED,
  SYNC_FAILED,
  CLOUD_LOG_LIST_FAILED,
  logSyncError,
} from "../lib/syncErrorMessages";

const LAST_USED_KEY = "chiplog_last_used";

type SpeedMode = "rpm" | "vc";

interface LastUsedState {
  writerId?: string;
  materialId?: string;
  company?: string;
  chipId?: string;
  rpm?: string;
  feed?: string;
  doc?: string;
  productName?: string;
  productNo?: string;
  internalSerial?: string;
  speedMode?: SpeedMode;
  lastVc?: number;
  lastDiameter?: number;
}

function loadLastUsed(): Partial<LastUsedState> {
  try {
    const raw = localStorage.getItem(LAST_USED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as LastUsedState) : {};
  } catch {
    return {};
  }
}

function saveLastUsed(next: LastUsedState): void {
  try {
    localStorage.setItem(LAST_USED_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function validateLastUsed(
  last: Partial<LastUsedState>,
  people: PersonEntity[],
  materials: MaterialEntity[],
  chipIds: string[]
): Partial<LastUsedState> {
  const out: LastUsedState = {};
  if (last.writerId && people.some((p) => p.id === last.writerId)) out.writerId = last.writerId;
  if (last.materialId && materials.some((m) => m.id === last.materialId)) out.materialId = last.materialId;
  if (last.chipId && chipIds.includes(last.chipId)) out.chipId = last.chipId;
  if (last.company != null) out.company = String(last.company);
  if (last.rpm != null) out.rpm = String(last.rpm);
  if (last.feed != null) out.feed = String(last.feed);
  if (last.doc != null) out.doc = String(last.doc);
  if (last.productName != null) out.productName = String(last.productName);
  if (last.productNo != null) out.productNo = String(last.productNo);
  if (last.internalSerial != null) out.internalSerial = String(last.internalSerial);
  if (last.speedMode === "rpm" || last.speedMode === "vc") out.speedMode = last.speedMode;
  if (typeof last.lastVc === "number" && !Number.isNaN(last.lastVc)) out.lastVc = last.lastVc;
  if (typeof last.lastDiameter === "number" && !Number.isNaN(last.lastDiameter)) out.lastDiameter = last.lastDiameter;
  return out;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 周速 Vc (m/min) と径 D (mm) から rpm を計算。無効時は null */
function rpmFromVcAndDiameter(vc: number, diameterMm: number): number | null {
  if (!Number.isFinite(vc) || !Number.isFinite(diameterMm) || diameterMm <= 0) return null;
  return Math.round((1000 * vc) / (Math.PI * diameterMm));
}

function exportLogsToCSV(entries: LogEntity[]): void {
  const header =
    "date,writerName,company,productName,productNo,internalSerial,materialName,iso,chipId,rpm,feed,doc,memo";
  const rows = entries.map(
    (e) =>
      `${e.date},${e.writerName},${e.company},${e.productName},${e.productNo},${e.internalSerial},${e.materialName},${e.iso ?? ""},${e.chipId},${e.rpm},${e.feed},${e.doc},"${String(e.memo).replace(/"/g, '""')}"`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chiplog_${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CuttingLog() {
  const [searchParams] = useSearchParams();
  const chipFromUrl = searchParams.get("chip");
  const chip = chipFromUrl ? getChipById(chipFromUrl) : undefined;

  const [materials, setMaterials] = useState<MaterialEntity[]>([]);
  const [people, setPeople] = useState<PersonEntity[]>([]);
  const [logs, setLogs] = useState<LogEntity[]>([]);

  const [keyword, setKeyword] = useState("");
  const [filterMaterialId, setFilterMaterialId] = useState("");
  const [filterWriterId, setFilterWriterId] = useState("");
  const [filterChipId, setFilterChipId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO);
  const [writerId, setWriterId] = useState("");
  const [company, setCompany] = useState("");
  const [companySuggestions, setCompanySuggestions] = useState<CompanyEntity[]>([]);
  const [companySuggestionsOpen, setCompanySuggestionsOpen] = useState(false);
  const companySearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [productName, setProductName] = useState("");
  const [productNo, setProductNo] = useState("");
  const [internalSerial, setInternalSerial] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [chipId, setChipId] = useState(chipFromUrl ?? "");
  const [speedMode, setSpeedMode] = useState<SpeedMode>("rpm");
  const [rpm, setRpm] = useState("");
  const [vc, setVc] = useState("");
  const [diameter, setDiameter] = useState("");
  const [feed, setFeed] = useState("");
  const [doc, setDoc] = useState("");
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState(false);
  const [syncRetryInProgress, setSyncRetryInProgress] = useState(false);
  const [syncingLogIds, setSyncingLogIds] = useState<Set<string>>(() => new Set());
  const [cloudLogs, setCloudLogs] = useState<CloudLogItem[]>([]);
  const [cloudLogsLoading, setCloudLogsLoading] = useState(true);
  const [cloudLogsError, setCloudLogsError] = useState<string | null>(null);
  const [speedModeError, setSpeedModeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resyncError, setResyncError] = useState<string | null>(null);

  const [materialSearch, setMaterialSearch] = useState("");
  const [addWriterOpen, setAddWriterOpen] = useState(false);
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [newWriterName, setNewWriterName] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialIso, setNewMaterialIso] = useState<MaterialISO | "">("");
  const [catalogRec, setCatalogRec] = useState<CatalogRecommendationEntity | undefined>(undefined);
  const appliedLastUsedRef = useRef(false);

  const loadMaterials = useCallback(async () => {
    const list = await listMaterials();
    setMaterials(list);
  }, []);
  const loadPeople = useCallback(async () => {
    const list = await listPeople();
    setPeople(list);
  }, []);
  const runSearch = useCallback(async () => {
    const list = await searchLogs({
      keyword: keyword.trim() || undefined,
      materialId: filterMaterialId || undefined,
      writerId: filterWriterId || undefined,
      chipId: filterChipId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setLogs(list);
  }, [keyword, filterMaterialId, filterWriterId, filterChipId, dateFrom, dateTo]);

  const handleCompanyChange = useCallback((value: string) => {
    setCompany(value);
    if (companySearchTimeoutRef.current) {
      clearTimeout(companySearchTimeoutRef.current);
      companySearchTimeoutRef.current = null;
    }
    if (!value.trim()) {
      setCompanySuggestions([]);
      setCompanySuggestionsOpen(false);
      return;
    }
    companySearchTimeoutRef.current = setTimeout(async () => {
      companySearchTimeoutRef.current = null;
      const list = await searchCompanies(value.trim(), 8);
      setCompanySuggestions(list);
      setCompanySuggestionsOpen(list.length > 0);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (companySearchTimeoutRef.current) clearTimeout(companySearchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateFromLocalStorage();
      if (cancelled) return;
      await ensureCloudSyncStatusMigration();
      if (cancelled) return;
      await runSeedMaterialsIfNeeded();
      if (cancelled) return;
      await runSeedVNBR_PR930_IfNeeded();
      if (cancelled) return;
      const [matList, peopleList, logList] = await Promise.all([
        listMaterials(),
        listPeople(),
        searchLogs({}),
      ]);
      if (cancelled) return;
      setMaterials(matList);
      setPeople(peopleList);
      setLogs(logList);

      const pending = await getPendingCloudSyncLogs();
      if (pending.length > 0 && !cancelled) {
        queueMicrotask(() => setSyncRetryInProgress(true));
        for (const log of pending) {
          if (cancelled) break;
          try {
            const result = await syncLogToCloud(log);
            if (result.ok) {
              await updateLogCloudSyncStatus(
                log.id,
                "synced",
                new Date().toISOString(),
                null
              );
        } else {
            logSyncError("auto resend failed", result.error);
            await updateLogCloudSyncStatus(
              log.id,
              "sync_error",
              null,
              result.error
            );
          }
        } catch (err) {
          logSyncError("auto resend failed", err);
          const msg = err instanceof Error ? err.message : "Unknown error";
          await updateLogCloudSyncStatus(log.id, "sync_error", null, msg);
        }
        }
        if (!cancelled) {
          setSyncRetryInProgress(false);
          setLogs(await searchLogs({}));
          const cloudResult = await fetchCloudLogs();
          if (!cancelled) {
            if (cloudResult.ok) {
              setCloudLogs(cloudResult.items);
              setCloudLogsError(null);
            } else {
              setCloudLogsError(cloudResult.error);
            }
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCloudLogsLoading(true);
      setCloudLogsError(null);
      const result = await fetchCloudLogs();
      if (cancelled) return;
      if (result.ok) {
        setCloudLogs(result.items);
        setCloudLogsError(null);
      } else {
        setCloudLogs([]);
        logSyncError("fetchCloudLogs", result.error);
        setCloudLogsError(CLOUD_LOG_LIST_FAILED);
      }
      setCloudLogsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (chipFromUrl) {
      queueMicrotask(() => setChipId(chipFromUrl));
    }
  }, [chipFromUrl]);

  useEffect(() => {
    if (!chipId || !materialId) {
      queueMicrotask(() => setCatalogRec(undefined));
      return;
    }
    const chip = getChipById(chipId);
    const material = materials.find((m) => m.id === materialId);
    const iso = material?.iso;
    if (!chip || !iso) {
      queueMicrotask(() => setCatalogRec(undefined));
      return;
    }
    let cancelled = false;
    (async () => {
      await ensureCatalogRecommendationsSeeded();
      if (cancelled) return;
      // カタログ検索では型番からの推定を最優先（旧DBの breakerCode より優先）
      const inferred = inferCatalogBreakerKeyFromModel(chip.code);
      const breakerForCatalog = inferred ?? chip.breakerCode ?? undefined;
      const rec = await getBestCatalogRecommendation({
        maker: chip.maker,
        grade: chip.gradeId,
        iso,
        breakerCode:
          breakerForCatalog != null && String(breakerForCatalog).trim() !== ""
            ? String(breakerForCatalog).trim()
            : null,
        noseRmm: chip.noseRmm ?? null,
      });
      if (!cancelled) setCatalogRec(rec);
    })();
    return () => {
      cancelled = true;
    };
  }, [chipId, materialId, materials]);

  useEffect(() => {
    if (appliedLastUsedRef.current || (people.length === 0 && materials.length === 0)) return;
    const last = loadLastUsed();
    const chipIds = chips.map((c) => c.id);
    const valid = validateLastUsed(last, people, materials, chipIds);
    if (Object.keys(valid).length === 0) return;
    appliedLastUsedRef.current = true;
    queueMicrotask(() => {
      if (valid.writerId != null) setWriterId(valid.writerId);
      if (valid.materialId != null) setMaterialId(valid.materialId);
      if (valid.chipId != null && !chipFromUrl) setChipId(valid.chipId);
      if (valid.company != null) setCompany(valid.company);
      if (valid.speedMode != null) setSpeedMode(valid.speedMode);
      if (valid.rpm != null) setRpm(valid.rpm);
      if (valid.lastVc != null) setVc(String(valid.lastVc));
      if (valid.lastDiameter != null) setDiameter(String(valid.lastDiameter));
      if (valid.feed != null) setFeed(valid.feed);
      if (valid.doc != null) setDoc(valid.doc);
      if (valid.productName != null) setProductName(valid.productName);
      if (valid.productNo != null) setProductNo(valid.productNo);
      if (valid.internalSerial != null) setInternalSerial(valid.internalSerial);
    });
  }, [people, materials, chipFromUrl]);

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const refreshCloudLogs = useCallback(async () => {
    const result = await fetchCloudLogs();
    if (result.ok) {
      setCloudLogs(result.items);
      setCloudLogsError(null);
    } else {
      logSyncError("refreshCloudLogs", result.error);
      setCloudLogsError(CLOUD_LOG_LIST_FAILED);
    }
  }, []);

  const loadEntryIntoForm = useCallback((entry: LogEntity) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setWriterId(entry.writerId);
    setCompany(entry.company ?? "");
    setProductName(entry.productName ?? "");
    setProductNo(entry.productNo ?? "");
    setInternalSerial(entry.internalSerial ?? "");
    setMaterialId(entry.materialId);
    setChipId(entry.chipId);
    setSpeedMode("rpm");
    setRpm(String(entry.rpm));
    setVc("");
    setDiameter("");
    setFeed(String(entry.feed));
    setDoc(String(entry.doc));
    setMemo(entry.memo ?? "");
    setSpeedModeError(null);
    setCloudSyncError(false);
    setFormError(null);
    setResyncError(null);
  }, []);

  const clearForm = useCallback(() => {
    setEditingId(null);
    setDate(todayISO());
    setWriterId("");
    setCompany("");
    setCompanySuggestions([]);
    setCompanySuggestionsOpen(false);
    setProductName("");
    setProductNo("");
    setInternalSerial("");
    setMaterialId("");
    setChipId(chipFromUrl ?? "");
    setSpeedMode("rpm");
    setRpm("");
    setVc("");
    setDiameter("");
    setFeed("");
    setDoc("");
    setMemo("");
    setSpeedModeError(null);
    setCloudSyncError(false);
    setFormError(null);
    setResyncError(null);
  }, [chipFromUrl]);

  const resetFormAndLastUsed = useCallback(() => {
    try {
      localStorage.removeItem(LAST_USED_KEY);
    } catch {
      // ignore
    }
    appliedLastUsedRef.current = false;
    setEditingId(null);
    setDate(todayISO());
    setWriterId("");
    setCompany("");
    setCompanySuggestions([]);
    setCompanySuggestionsOpen(false);
    setProductName("");
    setProductNo("");
    setInternalSerial("");
    setMaterialId("");
    setChipId(chipFromUrl ?? "");
    setSpeedMode("rpm");
    setRpm("");
    setVc("");
    setDiameter("");
    setFeed("");
    setDoc("");
    setMemo("");
    setSpeedModeError(null);
  }, [chipFromUrl]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSpeedModeError(null);
      setCloudSyncError(false);
      setFormError(null);
      if (!writerId || !materialId || !chipId || !date) return;
      if (saving) return;
      setSaving(true);
      let effectiveRpm: number;
      if (speedMode === "rpm") {
        effectiveRpm = Number(rpm) || 0;
      } else {
        const vcNum = parseFloat(vc);
        const dNum = parseFloat(diameter);
        const computed = rpmFromVcAndDiameter(vcNum, dNum);
        if (computed === null) {
          setSpeedModeError("周速 Vc と径 D を入力してください（径は 0 より大きい値）");
          setSaving(false);
          return;
        }
        effectiveRpm = computed;
      }
      const mat = materials.find((m) => m.id === materialId);
      const person = people.find((p) => p.id === writerId);
      const payload: LogInsert = {
        date,
        chipId,
        materialId,
        materialName: mat?.name ?? "",
        writerId,
        writerName: person?.name ?? "",
        company: company.trim(),
        productName: productName.trim(),
        productNo: productNo.trim(),
        internalSerial: internalSerial.trim(),
        rpm: effectiveRpm,
        feed: Number(feed) || 0,
        doc: Number(doc) || 0,
        memo: memo.trim(),
        iso: mat?.iso,
      };
      try {
        if (company.trim()) {
          const c = await addCompany(company.trim());
          await touchCompany(c.id);
        }
        let entity: LogEntity;
        if (editingId) {
          await updateLog(editingId, payload);
          const updated = await getLogById(editingId);
          if (!updated) throw new Error("Failed to read updated log");
          entity = updated;
        } else {
          entity = await addLog(payload);
        }
        setSaved(true);
        try {
          const result = await syncLogToCloud(entity);
          if (result.ok) {
            await updateLogCloudSyncStatus(
              entity.id,
              "synced",
              new Date().toISOString(),
              null
            );
          } else {
            logSyncError("Cloud sync failed (after save)", result.error);
            setCloudSyncError(true);
            setFormError(SYNC_FAILED);
            await updateLogCloudSyncStatus(
              entity.id,
              "sync_error",
              null,
              result.error
            );
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          logSyncError("Cloud sync failed (after save)", err);
          setCloudSyncError(true);
          setFormError(SYNC_FAILED);
          await updateLogCloudSyncStatus(entity.id, "sync_error", null, message);
        }
        const lastUsed: LastUsedState = {
          writerId,
          materialId,
          company: company.trim(),
          chipId,
          rpm: String(effectiveRpm),
          feed: String(Number(feed) || 0),
          doc: String(Number(doc) || 0),
          productName: productName.trim(),
          productNo: productNo.trim(),
          internalSerial: internalSerial.trim(),
          speedMode,
        };
        if (speedMode === "vc") {
          const vcNum = parseFloat(vc);
          const dNum = parseFloat(diameter);
          if (Number.isFinite(vcNum)) lastUsed.lastVc = vcNum;
          if (Number.isFinite(dNum)) lastUsed.lastDiameter = dNum;
        }
        saveLastUsed(lastUsed);
        clearForm();
        runSearch();
        refreshCloudLogs();
      } catch (err) {
        logSyncError("Log save failed", err);
        setFormError(SAVE_FAILED);
      } finally {
        setSaving(false);
      }
    },
    [
      saving,
      refreshCloudLogs,
      writerId,
      materialId,
      chipId,
      date,
      company,
      productName,
      productNo,
      internalSerial,
      speedMode,
      rpm,
      vc,
      diameter,
      feed,
      doc,
      memo,
      materials,
      people,
      editingId,
      clearForm,
      runSearch,
    ]
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      await deleteLog(id);
      if (editingId === id) clearForm();
      runSearch();
    },
    [editingId, clearForm, runSearch]
  );

  const handleResync = useCallback(
    async (e: React.MouseEvent, entry: LogEntity) => {
      e.preventDefault();
      e.stopPropagation();
      if (syncingLogIds.has(entry.id)) return;
      setResyncError(null);
      setSyncingLogIds((prev) => new Set(prev).add(entry.id));
      try {
        const result = await syncLogToCloud(entry);
        if (result.ok) {
          await updateLogCloudSyncStatus(
            entry.id,
            "synced",
            new Date().toISOString(),
            null
          );
          runSearch();
          refreshCloudLogs();
        } else {
          logSyncError("Manual resync failed", result.error);
          await updateLogCloudSyncStatus(
            entry.id,
            "sync_error",
            null,
            result.error
          );
          setResyncError(SYNC_FAILED);
          runSearch();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logSyncError("Manual resync failed", err);
        await updateLogCloudSyncStatus(entry.id, "sync_error", null, message);
        setResyncError(SYNC_FAILED);
        runSearch();
      } finally {
        setSyncingLogIds((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }
    },
    [syncingLogIds, runSearch, refreshCloudLogs]
  );

  const handleAddWriter = useCallback(async () => {
    const name = newWriterName.trim();
    if (!name) return;
    try {
      const p = await addPerson(name);
      await loadPeople();
      setWriterId(p.id);
      setNewWriterName("");
      setAddWriterOpen(false);
    } catch (err) {
      console.error(err);
    }
  }, [newWriterName, loadPeople]);

  const handleAddMaterial = useCallback(async () => {
    const name = newMaterialName.trim();
    if (!name) return;
    try {
      const m = await addMaterial(name, newMaterialIso || undefined);
      await loadMaterials();
      setMaterialId(m.id);
      setNewMaterialName("");
      setNewMaterialIso("");
      setAddMaterialOpen(false);
    } catch (err) {
      console.error(err);
    }
  }, [newMaterialName, newMaterialIso, loadMaterials]);

  const clearSearch = useCallback(async () => {
    setKeyword("");
    setFilterMaterialId("");
    setFilterWriterId("");
    setFilterChipId("");
    setDateFrom("");
    setDateTo("");
    const list = await searchLogs({});
    setLogs(list);
  }, []);

  return (
    <div className="page cutting-log-page">
      <header className="page-header">
        <h1 className="app-logo">CHIPLOG</h1>
        <h2 className="page-title">Cutting Log</h2>
      </header>
      {chip && (
        <p className="cutting-log__selected-chip">
          選択中チップ: {chip.code}
        </p>
      )}

      <section className="cutting-log-search-panel card">
        <h3 className="cutting-log-search-panel__title">検索</h3>
        <div className="cutting-log-search-panel__grid">
          <div className="cutting-log-search-panel__field">
            <label className="cutting-log-form__label">キーワード</label>
            <input
              type="search"
              className="cutting-log-form__input"
              placeholder="社名・品名・品番・社内製番・メモ"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="cutting-log-search-panel__field">
            <label className="cutting-log-form__label">記入者</label>
            <select
              className="cutting-log-form__input cutting-log-form__select"
              value={filterWriterId}
              onChange={(e) => setFilterWriterId(e.target.value)}
            >
              <option value="">すべて</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="cutting-log-search-panel__field">
            <label className="cutting-log-form__label">材質</label>
            <select
              className="cutting-log-form__input cutting-log-form__select"
              value={filterMaterialId}
              onChange={(e) => setFilterMaterialId(e.target.value)}
            >
              <option value="">すべて</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.iso ? ` — ${ISO_LABEL[m.iso]}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="cutting-log-search-panel__field">
            <label className="cutting-log-form__label">チップ</label>
            <select
              className="cutting-log-form__input cutting-log-form__select"
              value={filterChipId}
              onChange={(e) => setFilterChipId(e.target.value)}
            >
              <option value="">すべて</option>
              {chips.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          <div className="cutting-log-search-panel__field">
            <label className="cutting-log-form__label">日付から</label>
            <input
              type="date"
              className="cutting-log-form__input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="cutting-log-search-panel__field">
            <label className="cutting-log-form__label">日付まで</label>
            <input
              type="date"
              className="cutting-log-form__input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <div className="cutting-log-search-panel__actions">
          <button type="button" className="btn-search" onClick={runSearch}>
            検索
          </button>
          <button type="button" className="btn-cancel" onClick={clearSearch}>
            クリア
          </button>
          <button type="button" className="btn-cancel cutting-log-reset-last-used" onClick={resetFormAndLastUsed}>
            最後に使った値をリセット
          </button>
        </div>
      </section>

      <div className="cutting-log-export">
        <button
          type="button"
          className="btn-export"
          onClick={() => exportLogsToCSV(logs)}
        >
          CSV Export
        </button>
      </div>

      <form className="cutting-log-form card" onSubmit={handleSubmit}>
        <div className="cutting-log-form-grid">
          {/* 1行目: 日付、記入者、社内製番（均等3列） */}
          <div className="form-field span-4">
            <label className="cutting-log-form__label" htmlFor="log-date">
              日付 <span className="cutting-log-form__required">必須</span>
            </label>
            <input
              id="log-date"
              type="date"
              className="cutting-log-form__input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-field span-4">
            <label className="cutting-log-form__label">記入者 <span className="cutting-log-form__required">必須</span></label>
            <div className="form-field__inline">
              <select
                className="cutting-log-form__input cutting-log-form__select"
                value={writerId}
                onChange={(e) => setWriterId(e.target.value)}
                required
              >
                <option value="">選択</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {!addWriterOpen ? (
                <button type="button" className="btn-inline-add" onClick={() => setAddWriterOpen(true)}>
                  追加
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    className="cutting-log-form__input"
                    placeholder="記入者名"
                    value={newWriterName}
                    onChange={(e) => setNewWriterName(e.target.value)}
                  />
                  <button type="button" className="btn-save-sm" onClick={handleAddWriter}>
                    追加
                  </button>
                  <button type="button" className="btn-cancel-sm" onClick={() => setAddWriterOpen(false)}>
                    キャンセル
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="form-field span-4">
            <label className="cutting-log-form__label" htmlFor="log-internalSerial">社内製番</label>
            <input id="log-internalSerial" type="text" className="cutting-log-form__input" value={internalSerial} onChange={(e) => setInternalSerial(e.target.value)} />
          </div>

          {/* 2行目: 社名、品名、品番 */}
          <div className="form-field span-4 form-field--company-autocomplete">
            <label className="cutting-log-form__label" htmlFor="log-company">社名</label>
            <div className="company-input-wrap">
              <input
                id="log-company"
                type="text"
                className="cutting-log-form__input"
                value={company}
                onChange={(e) => handleCompanyChange(e.target.value)}
                onBlur={() => setCompanySuggestionsOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCompanySuggestionsOpen(false);
                }}
                autoComplete="off"
              />
              {companySuggestionsOpen && companySuggestions.length > 0 && (
                <ul className="company-suggestions" role="listbox">
                  {companySuggestions.map((c) => (
                    <li
                      key={c.id}
                      className="company-suggestions__item"
                      role="option"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setCompany(c.name);
                        setCompanySuggestionsOpen(false);
                        setCompanySuggestions([]);
                      }}
                    >
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="form-field span-4">
            <label className="cutting-log-form__label" htmlFor="log-productName">品名</label>
            <input id="log-productName" type="text" className="cutting-log-form__input" value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div className="form-field span-4">
            <label className="cutting-log-form__label" htmlFor="log-productNo">品番</label>
            <input id="log-productNo" type="text" className="cutting-log-form__input" value={productNo} onChange={(e) => setProductNo(e.target.value)} />
          </div>

          {/* 3行目: チップ・材質（均等2列） */}
          <div className="form-field span-6">
            <label className="cutting-log-form__label">チップ <span className="cutting-log-form__required">必須</span></label>
            <select
              className="cutting-log-form__input cutting-log-form__select"
              value={chipId}
              onChange={(e) => setChipId(e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {chips.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field span-6">
            <label className="cutting-log-form__label">材質 <span className="cutting-log-form__required">必須</span></label>
            <div className="form-field__inline form-field__inline--main">
              <input
                type="text"
                className="cutting-log-form__input form-field__search"
                placeholder="検索..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
              />
              <select
                className="cutting-log-form__input cutting-log-form__select"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                required
              >
                <option value="">選択</option>
                {filteredMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.iso ? ` — ${ISO_LABEL[m.iso]}` : ""}
                  </option>
                ))}
              </select>
              {!addMaterialOpen ? (
                <button type="button" className="btn-inline-add" onClick={() => setAddMaterialOpen(true)}>
                  追加
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    className="cutting-log-form__input"
                    placeholder="材質名（例: S45C）"
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                  />
                  <select
                    className="cutting-log-form__input cutting-log-form__select"
                    value={newMaterialIso}
                    onChange={(e) => setNewMaterialIso(e.target.value as MaterialISO | "")}
                    title="ISO（推奨）"
                  >
                    <option value="">ISO未選択</option>
                    {MATERIAL_ISO_OPTIONS.map((iso) => (
                      <option key={iso} value={iso}>
                        {ISO_LABEL[iso]}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-save-sm" onClick={handleAddMaterial}>
                    追加
                  </button>
                  <button type="button" className="btn-cancel-sm" onClick={() => setAddMaterialOpen(false)}>
                    キャンセル
                  </button>
                </>
              )}
            </div>
          </div>

          {catalogRec && (
            <div className="form-field span-12 cutting-log__catalog-rec">
              <span className="cutting-log__catalog-rec-label">メーカー推奨（カタログ）:</span>
              <span className="cutting-log__catalog-rec-value">
                Vc {catalogRec.vcMin ?? "—"}–{catalogRec.vcMax ?? "—"} m/min
                {" / "}
                f {catalogRec.feedMin ?? "—"}–{catalogRec.feedMax ?? "—"} mm/rev
                {" / "}
                ap {catalogRec.apMin ?? "—"}–{catalogRec.apMax ?? "—"} mm
                {catalogRec.note && ` / ${catalogRec.note}`}
                {catalogRec.sourceUrl && (
                  <>
                    {" "}
                    <a href={catalogRec.sourceUrl} target="_blank" rel="noreferrer">参照</a>
                  </>
                )}
              </span>
            </div>
          )}

          {/* 4行目: 切削条件（回転数・送り・切込みを横並び） */}
          <div className="form-field span-12 cutting-log-speed-block">
            <div className="cutting-log-speed-block__mode">
              <label className="cutting-log-form__label">回転数・周速</label>
              <div className="speed-mode-toggle" role="radiogroup" aria-label="入力モード">
                <label className="speed-mode-toggle__option">
                  <input
                    type="radio"
                    name="speedMode"
                    value="rpm"
                    checked={speedMode === "rpm"}
                    onChange={() => { setSpeedMode("rpm"); setSpeedModeError(null); }}
                  />
                  <span>rpm入力</span>
                </label>
                <label className="speed-mode-toggle__option">
                  <input
                    type="radio"
                    name="speedMode"
                    value="vc"
                    checked={speedMode === "vc"}
                    onChange={() => { setSpeedMode("vc"); setSpeedModeError(null); }}
                  />
                  <span>周速入力（Vc）</span>
                </label>
              </div>
            </div>
            <div className={`cutting-log-speed-block__inputs cutting-log-speed-block__inputs--${speedMode === "vc" ? "triple" : "single"}`}>
              {speedMode === "rpm" ? (
                <div className="form-field__cell">
                  <label className="cutting-log-form__label" htmlFor="log-rpm">回転数 rpm</label>
                  <input id="log-rpm" type="text" inputMode="numeric" className="cutting-log-form__input" placeholder="例: 1000" value={rpm} onChange={(e) => setRpm(e.target.value)} />
                </div>
              ) : (
                <>
                  <div className="form-field__cell">
                    <label className="cutting-log-form__label" htmlFor="log-vc">周速 Vc (m/min)</label>
                    <input id="log-vc" type="text" inputMode="decimal" className="cutting-log-form__input" placeholder="例: 80" value={vc} onChange={(e) => setVc(e.target.value)} />
                  </div>
                  <div className="form-field__cell">
                    <label className="cutting-log-form__label" htmlFor="log-diameter">径 D (mm)</label>
                    <input id="log-diameter" type="text" inputMode="decimal" className="cutting-log-form__input" placeholder="例: 10" value={diameter} onChange={(e) => setDiameter(e.target.value)} />
                  </div>
                  <div className="form-field__cell">
                    <label className="cutting-log-form__label">rpm（計算）</label>
                    <div className="cutting-log-form__input cutting-log-form__input--readonly" aria-readonly>
                      {(() => {
                        const vcNum = parseFloat(vc);
                        const dNum = parseFloat(diameter);
                        const computed = rpmFromVcAndDiameter(vcNum, dNum);
                        return computed !== null ? String(computed) : "—";
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="form-field__cell">
              <label className="cutting-log-form__label" htmlFor="log-feed">送り mm/rev</label>
              <input id="log-feed" type="text" inputMode="decimal" className="cutting-log-form__input" placeholder="例: 0.1" value={feed} onChange={(e) => setFeed(e.target.value)} />
            </div>
            <div className="form-field__cell">
              <label className="cutting-log-form__label" htmlFor="log-doc">切込み ap</label>
              <input id="log-doc" type="text" inputMode="decimal" className="cutting-log-form__input" placeholder="例: 1.0" value={doc} onChange={(e) => setDoc(e.target.value)} />
            </div>
          </div>
          {speedModeError && (
            <p className="cutting-log-form__error span-12" role="alert">{speedModeError}</p>
          )}

          {/* 5行目: メモ */}
          <div className="form-field span-12">
            <label className="cutting-log-form__label" htmlFor="log-memo">メモ</label>
            <textarea id="log-memo" className="cutting-log-form__input cutting-log-form__textarea" rows={3} placeholder="メモ" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          <div className="cutting-log-form__actions span-12">
            <button type="submit" className="btn-save" disabled={saving}>
              {saving
                ? editingId
                  ? "更新中..."
                  : "保存中..."
                : editingId
                  ? "更新"
                  : "保存"}
            </button>
            {editingId && (
              <button type="button" className="btn-cancel" onClick={clearForm}>
                キャンセル
              </button>
            )}
          </div>
          {saved && <p className="cutting-log-form__saved span-12">保存しました</p>}
          {(formError || cloudSyncError) && (
            <p className="cutting-log-form__cloud-sync-error span-12" role="alert">
              {formError ?? SYNC_FAILED}
            </p>
          )}
        </div>
      </form>

      <section className="cutting-log-list">
        <h3 className="cutting-log-list__title">保存済みログ一覧</h3>
        {resyncError && (
          <p className="cutting-log-list__resync-error" role="alert">
            {resyncError}
          </p>
        )}
        {syncRetryInProgress && (
          <p className="cutting-log-list__sync-retry" aria-live="polite">
            未同期ログを再送中...
          </p>
        )}
        {logs.length === 0 ? (
          <p className="cutting-log-list__empty">ログがありません</p>
        ) : (
          <ul className="cutting-log-list__grid">
            {logs.map((entry) => {
              const chipCode = getChipById(entry.chipId)?.code ?? entry.chipId;
              const isEditing = editingId === entry.id;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`log-card card ${isEditing ? "log-card--editing" : ""}`}
                    onClick={() => loadEntryIntoForm(entry)}
                  >
                    <div className="log-card__row log-card__date">{entry.date}</div>
                    <div className="log-card__row">
                      <span className="log-card__label">記入者</span>
                      {entry.writerName || "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">社名</span>
                      {entry.company || "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">品名</span>
                      {entry.productName || "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">品番</span>
                      {entry.productNo || "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">社内製番</span>
                      {entry.internalSerial || "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">材質</span>
                      {entry.materialName || "—"}
                      {entry.iso ? ` — ${ISO_LABEL[entry.iso]}` : ""}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">チップ</span>
                      {chipCode}
                    </div>
                    <div className="log-card__row log-card__params">
                      {entry.rpm}rpm / {entry.feed} / {entry.doc}
                    </div>
                    <span
                      className={`log-card__cloud-status log-card__cloud-status--${entry.cloudSyncStatus ?? "local_only"}`}
                      aria-label={`クラウド同期: ${entry.cloudSyncStatus === "synced" ? "同期済み" : entry.cloudSyncStatus === "sync_error" ? "同期エラー" : "未同期"}`}
                    >
                      {entry.cloudSyncStatus === "synced"
                        ? "同期済み"
                        : entry.cloudSyncStatus === "sync_error"
                          ? "同期エラー"
                          : "未同期"}
                    </span>
                    {(entry.cloudSyncStatus === "local_only" ||
                      entry.cloudSyncStatus === "sync_error") && (
                      <button
                        type="button"
                        className="log-card__resync"
                        onClick={(e) => handleResync(e, entry)}
                        disabled={syncingLogIds.has(entry.id)}
                        aria-label={syncingLogIds.has(entry.id) ? "同期中" : "再同期"}
                      >
                        {syncingLogIds.has(entry.id) ? "同期中..." : "再同期"}
                      </button>
                    )}
                    <button type="button" className="log-card__delete" onClick={(e) => handleDelete(e, entry.id)} aria-label="削除">
                      削除
                    </button>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cutting-log-cloud-list">
        <h3 className="cutting-log-list__title">クラウド保存済みログ一覧</h3>
        {cloudLogsLoading ? (
          <p className="cutting-log-cloud-list__loading">読み込み中...</p>
        ) : cloudLogsError ? (
          <p className="cutting-log-cloud-list__error" role="alert">
            {cloudLogsError}
          </p>
        ) : cloudLogs.length === 0 ? (
          <p className="cutting-log-list__empty">クラウドにログはありません</p>
        ) : (
          <ul className="cutting-log-list__grid">
            {cloudLogs.map((entry) => (
                <li key={entry.id}>
                  <div className="log-card card log-card--cloud">
                    <div className="log-card__row log-card__date">
                      {entry.date ?? "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">社名</span>
                      {entry.company_name ?? "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">品名</span>
                      {entry.product_name ?? "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">材質</span>
                      {entry.material_name ?? "—"}
                    </div>
                    <div className="log-card__row">
                      <span className="log-card__label">チップ</span>
                      {entry.chip_id ?? "—"}
                    </div>
                    <div className="log-card__row log-card__params">
                      {entry.rpm ?? "—"}rpm / {entry.feed ?? "—"} / {entry.doc ?? "—"}
                    </div>
                    {entry.memo ? (
                      <div className="log-card__row">
                        <span className="log-card__label">メモ</span>
                        {entry.memo}
                      </div>
                    ) : null}
                  </div>
                </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
