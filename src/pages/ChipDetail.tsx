import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import type { Use, Material, Machine } from "../data/chips";
import { getChipById, upsertChip } from "../lib/chipStore";
import { listGrades, upsertGrade } from "../lib/gradeStore";
import { listBreakers } from "../lib/breakerStore";
import type { GradeEntity } from "../lib/gradeStore";
import type { BreakerEntity } from "../lib/breakerStore";
import { ensureChipsSeeded } from "../lib/seedChips";
import { searchLogs } from "../lib/logStore";
import {
  uploadChipImage,
  getBlobKeyFromImageUrl,
  deleteChipImageBlob,
} from "../lib/cloudImageClient";
import {
  fetchChipImageUrl,
  upsertChipImageUrl,
} from "../lib/cloudChipImageUrlClient";
import { getChipMeta, setChipMeta, type ChipMeta } from "../lib/chipMetaStore";
import {
  getCondition,
  upsertCondition,
  MATERIAL_ISO_OPTIONS,
  ISO_LABEL,
  type MaterialISO,
  type ConditionSet,
} from "../lib/conditionStore";
import {
  getBestCatalogRecommendation,
  type CatalogRecommendationEntity,
} from "../lib/catalogRecommendationStore";
import { inferCatalogBreakerKeyFromModel } from "../lib/catalogKey";
import { getCatalogAssets, type CatalogAsset } from "../lib/catalogAsset";
import {
  IMAGE_UPLOAD_FAILED,
  IMAGE_DELETE_FAILED,
  logSyncError,
} from "../lib/syncErrorMessages";
import noImage from "../assets/no-image.png";

function catalogAssetFullUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${window.location.origin}${base}${path}`;
}

const USE_OPTIONS: Use[] = ["外径", "内径", "溝", "突切", "ネジ", "リア"];
const MATERIAL_OPTIONS: Material[] = ["P", "M", "N", "K", "S", "H"];
const MACHINE_OPTIONS: Machine[] = ["CITIZEN", "NC", "MINI"];

function formatConditionSet(set: ConditionSet): string {
  const parts: string[] = [];
  if (set.vcMin != null || set.vcMax != null)
    parts.push(`Vc: ${set.vcMin ?? "—"}–${set.vcMax ?? "—"} m/min`);
  if (set.feedMin != null || set.feedMax != null)
    parts.push(`送り: ${set.feedMin ?? "—"}–${set.feedMax ?? "—"} mm/rev`);
  if (set.apMin != null || set.apMax != null)
    parts.push(`ap: ${set.apMin ?? "—"}–${set.apMax ?? "—"} mm`);
  if (set.note) parts.push(set.note);
  return parts.length ? parts.join(" / ") : "—";
}

function hasAnyCondition(o: Partial<ConditionSet>): boolean {
  return Object.values(o).some(
    (v) =>
      v !== undefined &&
      v !== "" &&
      (typeof v !== "number" || !Number.isNaN(v))
  );
}

function formatRange(
  min?: number,
  max?: number,
  unit?: string
): string {
  if (min == null && max == null) return "—";
  const from = min != null ? String(min) : "—";
  const to = max != null ? String(max) : "—";
  return unit ? `${from}–${to} ${unit}` : `${from}–${to}`;
}

export function ChipDetail() {
  const { id } = useParams<{ id: string }>();
  const [chip, setChip] = useState<
    Awaited<ReturnType<typeof getChipById>> | undefined
  >(undefined);
  const [grade, setGrade] = useState<GradeEntity | undefined>(undefined);
  const [breaker, setBreaker] = useState<BreakerEntity | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      await ensureChipsSeeded();
      const loadedChip = await getChipById(id);
      if (cancelled) return;
      setChip(loadedChip ?? undefined);
      if (loadedChip) {
        const [grades, breakers] = await Promise.all([
          listGrades(),
          listBreakers(),
        ]);
        if (cancelled) return;
        setGrade(grades.find((g) => g.id === loadedChip.gradeId));
        if (loadedChip.breakerCode) {
          setBreaker(
            breakers.find(
              (b) =>
                b.maker === loadedChip.maker &&
                b.code === loadedChip.breakerCode
            )
          );
        } else {
          setBreaker(undefined);
        }
      } else {
        setGrade(undefined);
        setBreaker(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);
  const [chipLogs, setChipLogs] = useState<
    Awaited<ReturnType<typeof searchLogs>>
  >([]);
  useEffect(() => {
    if (!chip) {
      queueMicrotask(() => setChipLogs([]));
      return;
    }
    searchLogs({ chipId: chip.id }).then(setChipLogs);
  }, [chip]);

  const [imageUploading, setImageUploading] = useState(false);
  const [imageDeleting, setImageDeleting] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageDeleteError, setImageDeleteError] = useState<string | null>(null);
  const [cloudImageUrl, setCloudImageUrl] = useState<string | null>(null);
  const [conditionKey, setConditionKey] = useState(0);
  const [selectedIso, setSelectedIso] = useState<MaterialISO>("P");
  const [conditionEditOpen, setConditionEditOpen] = useState(false);
  const [conditionForm, setConditionForm] = useState<{
    shop: Partial<ConditionSet>;
  }>({ shop: {} });
  const [imageSheetOpen, setImageSheetOpen] = useState(false);
  const [chipMeta, setChipMetaState] = useState<ChipMeta | undefined>(undefined);
  const [metaEditOpen, setMetaEditOpen] = useState(false);
  const [metaForm, setMetaForm] = useState<{
    uses: Use[];
    materials: Material[];
    machines: Machine[];
  }>({
    uses: [],
    materials: [],
    machines: [],
  });
  const [descEditOpen, setDescEditOpen] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [applicationsText, setApplicationsText] = useState("");
  const [infoEditOpen, setInfoEditOpen] = useState(false);
  const [infoForm, setInfoForm] = useState<{
    maker: string;
    code: string;
    gradeId: string;
    shapeLabel: string;
    noseRmm: string;
    breakerCode: string;
    coatingShort: string;
    coatingDetail: string;
  }>({
    maker: "",
    code: "",
    gradeId: "",
    shapeLabel: "",
    noseRmm: "",
    breakerCode: "",
    coatingShort: "",
    coatingDetail: "",
  });
  const [catalogRec, setCatalogRec] = useState<CatalogRecommendationEntity | undefined>(
    undefined
  );
  const [catalogAssets, setCatalogAssets] = useState<CatalogAsset[]>([]);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const condition = useMemo(
    () => (chip ? getCondition(chip.id, selectedIso) : null),
    // conditionKey は条件保存後に再取得するために意図的に依存に含める
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chip, selectedIso, conditionKey]
  );

  useEffect(() => {
    if (!chip) return;
    setChipMetaState(getChipMeta(chip.id));
  }, [chip]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!chip) {
        setCatalogRec(undefined);
        return;
      }
      // カタログ検索では型番からの推定を最優先（旧DBの breakerCode より優先）
      const inferred = inferCatalogBreakerKeyFromModel(chip.code);
      const breakerForCatalog = inferred ?? chip.breakerCode ?? undefined;
      const rec = await getBestCatalogRecommendation({
        maker: chip.maker,
        grade: chip.gradeId,
        iso: selectedIso,
        breakerCode:
          breakerForCatalog != null && String(breakerForCatalog).trim() !== ""
            ? String(breakerForCatalog).trim()
            : null,
        noseRmm: chip.noseRmm ?? null,
      });
      if (cancelled) return;
      setCatalogRec(rec);
    })();
    return () => {
      cancelled = true;
    };
  }, [chip, selectedIso]);

  useEffect(() => {
    if (!chip) {
      setCatalogAssets([]);
      return;
    }
    let cancelled = false;
    getCatalogAssets(chip.maker, chip.code).then((assets) => {
      if (!cancelled) setCatalogAssets(assets);
    });
    return () => {
      cancelled = true;
    };
  }, [chip]);

  useEffect(() => {
    if (!chip) {
      setCloudImageUrl(null);
      return;
    }
    const chipId = chip.id;
    let cancelled = false;
    fetchChipImageUrl(chipId).then((result) => {
      if (cancelled) return;
      if (result.ok) setCloudImageUrl(result.image_url);
      else logSyncError("ChipDetail initial fetchChipImageUrl", result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [chip]);

  const lastDetailFetchAtRef = useRef(0);
  const DETAIL_FETCH_GUARD_MS = 800;
  useEffect(() => {
    if (!chip) return;
    const chipId = chip.id;
    const onRefetch = () => {
      const now = Date.now();
      if (now - lastDetailFetchAtRef.current < DETAIL_FETCH_GUARD_MS) return;
      lastDetailFetchAtRef.current = now;
      fetchChipImageUrl(chipId).then((result) => {
        if (result.ok) setCloudImageUrl(result.image_url);
        else logSyncError("ChipDetail refetch get-chip-image-url", result.error);
      });
    };
    const onFocus = () => onRefetch();
    const onVisibility = () => {
      if (document.visibilityState === "visible") onRefetch();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [chip]);

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !chip) return;
      if (imageUploading || imageDeleting) return;
      e.target.value = "";
      setImageSheetOpen(false);
      setImageUploadError(null);
      setImageUploading(true);
      try {
        const result = await uploadChipImage(chip.id, file);
        if (!result.success) {
          logSyncError("Image upload failed", result.error);
          setImageUploadError(IMAGE_UPLOAD_FAILED);
          return;
        }
        setCloudImageUrl(result.imageUrl);
        await upsertChip({
          id: chip.id,
          maker: chip.maker,
          code: chip.code,
          gradeId: chip.gradeId,
          uses: chip.uses,
          materials: chip.materials,
          machines: chip.machines,
          features: chip.features,
          applications: chip.applications,
          noseRmm: chip.noseRmm,
          breakerCode: chip.breakerCode,
          imageUrl: result.imageUrl,
        });
        const updated = await getChipById(chip.id);
        if (updated) setChip(updated);
      } finally {
        setImageUploading(false);
      }
    },
    [chip, imageUploading, imageDeleting]
  );

  const handleImageDelete = useCallback(async () => {
    if (!chip) return;
    if (imageUploading || imageDeleting) return;
    const urlToDelete =
      typeof cloudImageUrl === "string" ? cloudImageUrl : null;
    setImageDeleteError(null);
    setImageDeleting(true);
    try {
      const urlResult = await upsertChipImageUrl(chip.id, null);
      if (!urlResult.ok) {
        logSyncError("Image delete (upsertChipImageUrl) failed", urlResult.error);
        setImageDeleteError(IMAGE_DELETE_FAILED);
        return;
      }
      await upsertChip({
        id: chip.id,
        maker: chip.maker,
        code: chip.code,
        gradeId: chip.gradeId,
        uses: chip.uses,
        materials: chip.materials,
        machines: chip.machines,
        features: chip.features,
        applications: chip.applications,
        noseRmm: chip.noseRmm,
        breakerCode: chip.breakerCode,
        imageUrl: null,
      });
      const updated = await getChipById(chip.id);
      if (updated) setChip(updated);
      setCloudImageUrl(null);

      if (urlToDelete) {
        const key = getBlobKeyFromImageUrl(urlToDelete);
        if (key) {
          deleteChipImageBlob(key).catch((err) =>
            logSyncError("Blob delete (after reference cleared)", err)
          );
        }
      }
    } finally {
      setImageDeleting(false);
    }
  }, [chip, cloudImageUrl, imageUploading, imageDeleting]);

  const openConditionEdit = useCallback(() => {
    if (condition) {
      setConditionForm({ shop: condition.shop ?? {} });
    } else {
      setConditionForm({ shop: {} });
    }
    setConditionEditOpen(true);
  }, [condition]);

  const saveCondition = useCallback(() => {
    if (!chip) return;
    upsertCondition({
      chipId: chip.id,
      iso: selectedIso,
      maker: condition?.maker,
      shop: hasAnyCondition(conditionForm.shop) ? (conditionForm.shop as ConditionSet) : undefined,
      updatedAt: new Date().toISOString(),
    });
    setConditionKey((k) => k + 1);
    setConditionEditOpen(false);
  }, [chip, selectedIso, condition, conditionForm]);

  const displayUses = useMemo(
    () => (chip ? (chipMeta?.uses ?? chip.uses) : []),
    [chip, chipMeta]
  );
  const displayMaterials = useMemo(() => {
    if (!chip) return [];
    const base = chipMeta?.materials ?? chip.materials;
    if (base.length > 0) return base;
    if (!grade) return [];
    const allowed: Material[] = ["P", "M", "N", "K", "S", "H"];
    return grade.recommendedMaterials.filter((m): m is Material =>
      allowed.includes(m as Material)
    );
  }, [chip, chipMeta, grade]);

  const openMetaEdit = useCallback(() => {
    if (!chip) return;
    const meta = getChipMeta(chip.id);
    setMetaForm({
      uses: meta?.uses ?? chip.uses ?? [],
      materials: meta?.materials ?? chip.materials ?? [],
      machines: chip.machines ?? [],
    });
    setMetaEditOpen(true);
  }, [chip]);

  const saveMetaEdit = useCallback(() => {
    if (!chip) return;
    setChipMeta(chip.id, {
      uses: metaForm.uses,
      materials: metaForm.materials,
    });
    setChipMetaState(getChipMeta(chip.id));
    setMetaEditOpen(false);
    (async () => {
      await upsertChip({
        id: chip.id,
        maker: chip.maker,
        code: chip.code,
        gradeId: chip.gradeId,
        uses: chip.uses,
        materials: chip.materials,
        machines: metaForm.machines,
        noseRmm: chip.noseRmm,
        breakerCode: chip.breakerCode ?? null,
      });
      const updated = await getChipById(chip.id);
      setChip(updated ?? chip);
    })();
  }, [chip, metaForm]);

  const toggleUse = useCallback((u: Use) => {
    setMetaForm((f) => ({
      ...f,
      uses: f.uses.includes(u) ? f.uses.filter((x) => x !== u) : [...f.uses, u],
    }));
  }, []);

  const toggleMaterial = useCallback((m: Material) => {
    setMetaForm((f) => ({
      ...f,
      materials: f.materials.includes(m)
        ? f.materials.filter((x) => x !== m)
        : [...f.materials, m],
    }));
  }, []);

  const toggleMachine = useCallback((machine: Machine) => {
    setMetaForm((f) => ({
      ...f,
      machines: f.machines.includes(machine)
        ? f.machines.filter((x) => x !== machine)
        : [...f.machines, machine],
    }));
  }, []);

  const openDescEdit = useCallback(() => {
    if (!chip) return;
    setFeaturesText((chip.features ?? []).join("\n"));
    setApplicationsText((chip.applications ?? []).join("\n"));
    setDescEditOpen(true);
  }, [chip]);

  const saveDescEdit = useCallback(() => {
    if (!chip) return;
    const features = featuresText
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const applications = applicationsText
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    (async () => {
      await upsertChip({
        id: chip.id,
        maker: chip.maker,
        code: chip.code,
        gradeId: chip.gradeId,
        uses: chip.uses,
        materials: chip.materials,
        machines: chip.machines,
        noseRmm: chip.noseRmm,
        breakerCode: chip.breakerCode ?? null,
        features,
        applications,
      });
      const updated = await getChipById(chip.id);
      setChip(updated ?? chip);
      setDescEditOpen(false);
    })();
  }, [chip, featuresText, applicationsText]);

  const openInfoEdit = useCallback(() => {
    if (!chip) return;
    setInfoForm({
      maker: chip.maker,
      code: chip.code,
      gradeId: chip.gradeId,
      shapeLabel: chip.shapeLabel,
      noseRmm: chip.noseRmm != null ? String(chip.noseRmm) : "",
      breakerCode: chip.breakerCode ?? "",
      coatingShort: grade?.coatingShort ?? "",
      coatingDetail: grade?.coatingDetail ?? "",
    });
    setInfoEditOpen(true);
  }, [chip, grade]);

  const saveInfoEdit = useCallback(() => {
    if (!chip) return;
    const noseRmm =
      infoForm.noseRmm.trim() !== "" ? Number(infoForm.noseRmm.trim()) : null;
    if (Number.isNaN(noseRmm)) {
      window.alert("刃先Rは数値で入力してください");
      return;
    }
    (async () => {
      await upsertChip({
        id: chip.id,
        maker: infoForm.maker,
        code: infoForm.code,
        gradeId: infoForm.gradeId,
        uses: chip.uses,
        materials: chip.materials,
        machines: chip.machines,
        noseRmm,
        breakerCode: infoForm.breakerCode || null,
        features: chip.features,
        applications: chip.applications,
        shapeLabelOverride: infoForm.shapeLabel,
      });
      await upsertGrade({
        id: infoForm.gradeId,
        maker: grade?.maker,
        name: infoForm.gradeId,
        coatingShort: infoForm.coatingShort,
        coatingDetail: infoForm.coatingDetail,
        recommendedMaterials: grade?.recommendedMaterials ?? [],
      });
      const [updatedChip] = await Promise.all([
        getChipById(chip.id),
      ]);
      setChip(updatedChip ?? chip);
      setInfoEditOpen(false);
    })();
  }, [chip, grade, infoForm]);

  if (!chip) {
    return (
      <div className="page chip-detail-page">
        <header className="page-header">
          <h1 className="app-logo">CHIPLOG</h1>
          <h2 className="page-title">Chip Details</h2>
        </header>
        <p className="chip-detail__not-found">チップが見つかりません。</p>
        <Link to="/" className="btn-home">
          HOME
        </Link>
      </div>
    );
  }

  const isImageBusy = imageUploading || imageDeleting;

  // cloudImageUrl: undefined=未取得, null=取得済み・画像なし, string=取得済み・画像あり
  const displayImageUrl =
    cloudImageUrl === undefined
      ? chip.imageUrl
      : (cloudImageUrl ?? noImage);
  const hasCloudImage = typeof cloudImageUrl === "string";

  return (
    <div className="page chip-detail-page">
      <header className="page-header">
        <h1 className="app-logo">CHIPLOG</h1>
        <h2 className="page-title">Chip Details</h2>
      </header>

      <div className="chip-detail__main">
        <div className="chip-detail__image-block">
          <div className="chip-detail__image-wrap">
            <img
              src={displayImageUrl}
              alt={chip.code}
              className="chip-detail__image"
              onError={(e) => {
                e.currentTarget.src = noImage;
              }}
            />
          </div>
          <div className="chip-detail__image-actions">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="chip-detail__file-input"
              onChange={handleImageChange}
              disabled={isImageBusy}
              aria-hidden
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="chip-detail__file-input"
              onChange={handleImageChange}
              disabled={isImageBusy}
              aria-hidden
            />
            <button
              type="button"
              className="btn-chip-img"
              onClick={() => setImageSheetOpen(true)}
              disabled={isImageBusy}
            >
              {imageUploading ? "アップロード中…" : imageDeleting ? "削除中…" : "写真を変更"}
            </button>
            {imageUploadError && (
              <p className="chip-detail__image-error" role="alert">
                {imageUploadError}
              </p>
            )}
            {imageDeleteError && (
              <p className="chip-detail__image-error" role="alert">
                {imageDeleteError}
              </p>
            )}
            {hasCloudImage && (
              <button
                type="button"
                className="btn-chip-img btn-chip-img--danger"
                onClick={handleImageDelete}
                disabled={isImageBusy}
              >
                {imageDeleting ? "削除中…" : "写真を削除"}
              </button>
            )}
            {(cloudImageUrl === undefined || typeof cloudImageUrl === "string") && (
              <p className="chip-detail__image-status" aria-live="polite">
                {cloudImageUrl === undefined ? "確認中…" : "クラウド反映済み"}
              </p>
            )}
            {catalogAssets.length > 0 && (
              <button
                type="button"
                className="btn-catalog"
                onClick={() => setCatalogModalOpen(true)}
              >
                <span className="btn-catalog__icon" aria-hidden>📄</span>
                <span className="btn-catalog__en">Catalog</span>
                <span className="btn-catalog__ja">カタログ</span>
              </button>
            )}
          </div>
        </div>
        <div className="chip-detail__info">
          <dl className="chip-detail__dl">
            <dt>型番</dt>
            <dd>{chip.code}</dd>
            <dt>メーカー</dt>
            <dd>{chip.maker}</dd>
            <dt>材種</dt>
            <dd>{chip.gradeId}</dd>
            <dt>形状</dt>
            <dd>{chip.shapeLabel}</dd>
            <dt>刃先R</dt>
            <dd>{chip.noseRmm != null ? `R${chip.noseRmm}` : "—"}</dd>
            <dt>ブレーカー</dt>
            <dd className="chip-detail__breaker">
              {breaker ? (
                <>
                  <strong className="chip-detail__breaker-name">{breaker.name}</strong>
                  <span className="chip-detail__breaker-detail">{breaker.detail}</span>
                  {breaker.sourceNote && (
                    <span className="chip-detail__breaker-source">{breaker.sourceNote}</span>
                  )}
                </>
              ) : chip.breakerCode ? (
                <span>{chip.breakerCode}</span>
              ) : (
                "—"
              )}
            </dd>
            {grade && (
              <>
                <dt>コーティング</dt>
                <dd className="chip-detail__coating">
                  <strong className="chip-detail__coating-short">{grade.coatingShort}</strong>
                  <span className="chip-detail__coating-detail">{grade.coatingDetail}</span>
                </dd>
              </>
            )}
            <dt>被削材</dt>
            <dd>
              {displayMaterials.length > 0
                ? displayMaterials.map((iso) => ISO_LABEL[iso]).join(" / ")
                : "—"}
            </dd>
            <dt>用途</dt>
            <dd>{displayUses.length > 0 ? displayUses.join(" / ") : "—"}</dd>
          </dl>
          <button
            type="button"
            className="btn-edit-meta"
            onClick={openMetaEdit}
          >
            用途・被削材を編集
          </button>
          <button
            type="button"
            className="btn-edit-meta"
            onClick={openInfoEdit}
          >
            基本情報を編集
          </button>
          {metaEditOpen && (
            <div className="chip-detail-meta-form card">
              <h4 className="chip-detail-meta-form__title">用途・被削材・機械</h4>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">用途</span>
                <div className="chip-detail-meta-form__chips">
                  {USE_OPTIONS.map((u) => (
                    <label key={u} className="chip-detail-meta-form__chip">
                      <input
                        type="checkbox"
                        checked={metaForm.uses.includes(u)}
                        onChange={() => toggleUse(u)}
                      />
                      <span>{u}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">被削材</span>
                <div className="chip-detail-meta-form__chips">
                  {MATERIAL_OPTIONS.map((m) => (
                    <label key={m} className="chip-detail-meta-form__chip">
                      <input
                        type="checkbox"
                        checked={metaForm.materials.includes(m)}
                        onChange={() => toggleMaterial(m)}
                      />
                      <span>{ISO_LABEL[m]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">機械</span>
                <div className="chip-detail-meta-form__chips">
                  {MACHINE_OPTIONS.map((m) => (
                    <label key={m} className="chip-detail-meta-form__chip">
                      <input
                        type="checkbox"
                        checked={metaForm.machines.includes(m)}
                        onChange={() => toggleMachine(m)}
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="chip-detail-meta-form__actions">
                <button type="button" className="btn-save" onClick={saveMetaEdit}>
                  保存
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setMetaEditOpen(false)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
          {infoEditOpen && (
            <div className="chip-detail-meta-form card">
              <h4 className="chip-detail-meta-form__title">基本情報を編集</h4>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">型番</span>
                <input
                  className="cutting-log-form__input"
                  value={infoForm.code}
                  onChange={(e) =>
                    setInfoForm((f) => ({ ...f, code: e.target.value }))
                  }
                />
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">メーカー</span>
                <input
                  className="cutting-log-form__input"
                  value={infoForm.maker}
                  onChange={(e) =>
                    setInfoForm((f) => ({ ...f, maker: e.target.value }))
                  }
                />
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">材種ID</span>
                <input
                  className="cutting-log-form__input"
                  value={infoForm.gradeId}
                  onChange={(e) =>
                    setInfoForm((f) => ({ ...f, gradeId: e.target.value }))
                  }
                />
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">形状</span>
                <input
                  className="cutting-log-form__input"
                  value={infoForm.shapeLabel}
                  onChange={(e) =>
                    setInfoForm((f) => ({ ...f, shapeLabel: e.target.value }))
                  }
                />
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">刃先R (mm)</span>
                <input
                  className="cutting-log-form__input"
                  value={infoForm.noseRmm}
                  onChange={(e) =>
                    setInfoForm((f) => ({ ...f, noseRmm: e.target.value }))
                  }
                />
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">ブレーカー</span>
                <input
                  className="cutting-log-form__input"
                  value={infoForm.breakerCode}
                  onChange={(e) =>
                    setInfoForm((f) => ({ ...f, breakerCode: e.target.value }))
                  }
                />
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">コーティング（短）</span>
                <input
                  className="cutting-log-form__input"
                  value={infoForm.coatingShort}
                  onChange={(e) =>
                    setInfoForm((f) => ({ ...f, coatingShort: e.target.value }))
                  }
                />
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">コーティング詳細</span>
                <textarea
                  className="cutting-log-form__textarea"
                  value={infoForm.coatingDetail}
                  onChange={(e) =>
                    setInfoForm((f) => ({
                      ...f,
                      coatingDetail: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="chip-detail-meta-form__actions">
                <button type="button" className="btn-save" onClick={saveInfoEdit}>
                  保存
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setInfoEditOpen(false)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(chip.features.length > 0 || chip.applications.length > 0) && (
        <section className="chip-detail__section card">
          <h3 className="chip-detail__section-title">カード内容</h3>
          {chip.features.length > 0 && (
            <>
              <h4 className="chip-detail__section-subtitle">特長</h4>
              <ul className="chip-detail__list">
                {chip.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}
          {chip.applications.length > 0 && (
            <>
              <h4 className="chip-detail__section-subtitle">応用</h4>
              <ul className="chip-detail__list">
                {chip.applications.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
          <button
            type="button"
            className="btn-edit-meta"
            onClick={openDescEdit}
          >
            カードの文章を編集
          </button>
          {descEditOpen && (
            <div className="chip-detail-meta-form card">
              <h4 className="chip-detail-meta-form__title">カード内容編集</h4>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">特長</span>
                <textarea
                  className="cutting-log-form__textarea"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder={"1行につき1項目で入力してください"}
                />
              </div>
              <div className="chip-detail-meta-form__group">
                <span className="chip-detail-meta-form__label">応用</span>
                <textarea
                  className="cutting-log-form__textarea"
                  value={applicationsText}
                  onChange={(e) => setApplicationsText(e.target.value)}
                  placeholder={"1行につき1項目で入力してください"}
                />
              </div>
              <div className="chip-detail-meta-form__actions">
                <button type="button" className="btn-save" onClick={saveDescEdit}>
                  保存
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setDescEditOpen(false)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="chip-detail__section card chip-detail-conditions">
        <h3 className="chip-detail__section-title">切削条件</h3>
        <div className="chip-detail-conditions__iso">
          <label className="chip-detail-conditions__label">材質(ISO)</label>
          <select
            className="chip-detail-conditions__select"
            value={selectedIso}
            onChange={(e) => setSelectedIso(e.target.value as MaterialISO)}
          >
            {MATERIAL_ISO_OPTIONS.map((iso) => (
              <option key={iso} value={iso}>
                {ISO_LABEL[iso]}
              </option>
            ))}
          </select>
        </div>
        <div className="chip-detail-conditions__rows">
          <div className="chip-detail-conditions__row">
            <span className="chip-detail-conditions__row-label">
              メーカー推奨
            </span>
            <span className="chip-detail-conditions__row-value">
              {catalogRec ? (
                <>
                  Vc {formatRange(catalogRec.vcMin, catalogRec.vcMax, "m/min")}
                  {" / "}
                  f {formatRange(catalogRec.feedMin, catalogRec.feedMax, "mm/rev")}
                  {" / "}
                  ap {formatRange(catalogRec.apMin, catalogRec.apMax, "mm")}
                  {catalogRec.note && ` / ${catalogRec.note}`}
                  {catalogRec.sourceUrl && (
                    <>
                      {" / "}
                      <a
                        href={catalogRec.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        link
                      </a>
                    </>
                  )}
                </>
              ) : (
                "未登録"
              )}
            </span>
          </div>
          <div className="chip-detail-conditions__row">
            <span className="chip-detail-conditions__row-label">鉄屋推奨</span>
            <span className="chip-detail-conditions__row-value">
              {condition?.shop ? formatConditionSet(condition.shop) : "未登録"}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn-edit-condition"
          onClick={openConditionEdit}
        >
          編集
        </button>
        {conditionEditOpen && (
          <div className="chip-detail-condition-form">
            <h4 className="chip-detail-condition-form__title">鉄屋推奨</h4>
            <ConditionSetForm
              set={conditionForm.shop}
              onChange={(shop) => setConditionForm((f) => ({ ...f, shop }))}
            />
            <div className="chip-detail-condition-form__actions">
              <button type="button" className="btn-save" onClick={saveCondition}>
                保存
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setConditionEditOpen(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>

      {chipLogs.length > 0 && (
        <section className="chip-detail__section card chip-detail-logs">
          <h3 className="chip-detail__section-title">このチップのログ</h3>
          <ul className="chip-detail-logs__list">
            {chipLogs.map((entry) => (
              <li key={entry.id} className="chip-detail-logs__item">
                <Link
                  to={`/cutting-log?chip=${chip.id}`}
                  className="chip-detail-logs__link"
                >
                  <span className="chip-detail-logs__date">{entry.date}</span>
                  <span className="chip-detail-logs__params">
                    {entry.materialName || "—"} / {entry.rpm}rpm / {entry.feed} /{" "}
                    {entry.doc}
                  </span>
                  {entry.memo && (
                    <span className="chip-detail-logs__memo">{entry.memo}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="chip-detail__footer">
        <Link to={`/cutting-log?chip=${chip.id}`} className="btn-log">
          このチップで切削ログを書く
        </Link>
        <Link to="/" className="btn-home">
          HOME
        </Link>
      </div>

      {imageSheetOpen && (
        <>
          <div
            className="chip-detail-sheet-backdrop"
            onClick={() => setImageSheetOpen(false)}
            aria-hidden
          />
          <div className="chip-detail-sheet" role="dialog" aria-label="写真を変更">
            <button
              type="button"
              className="chip-detail-sheet__item"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isImageBusy}
            >
              写真を撮る
            </button>
            <button
              type="button"
              className="chip-detail-sheet__item"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImageBusy}
            >
              ファイルを選ぶ
            </button>
            <button
              type="button"
              className="chip-detail-sheet__item chip-detail-sheet__cancel"
              onClick={() => setImageSheetOpen(false)}
            >
              キャンセル
            </button>
          </div>
        </>
      )}

      {catalogModalOpen && catalogAssets.length > 0 && (
        <>
          <div
            className="chip-detail-catalog-backdrop"
            onClick={() => setCatalogModalOpen(false)}
            aria-hidden
          />
          <div
            className="chip-detail-catalog-modal"
            role="dialog"
            aria-label="カタログ"
          >
            <div className="chip-detail-catalog-modal__head">
              <h3 className="chip-detail-catalog-modal__title">Catalog</h3>
              <button
                type="button"
                className="chip-detail-catalog-modal__close"
                onClick={() => setCatalogModalOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="chip-detail-catalog-modal__body">
              {catalogAssets[0].type === "pdf" ? (
                <>
                  <div className="chip-detail-catalog-modal__links chip-detail-catalog-modal__links--top">
                    {catalogAssets.map((a, i) => (
                      <p key={a.url} className="chip-detail-catalog-modal__link-wrap">
                        <a
                          href={catalogAssetFullUrl(a.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="chip-detail-catalog-modal__link"
                        >
                          {catalogAssets.length > 1
                            ? `${a.index ?? i + 1}. 新しいタブで開く`
                            : "新しいタブで開く"}
                        </a>
                      </p>
                    ))}
                  </div>
                  <div className="chip-detail-catalog-modal__pdf-wrap">
                    <object
                      data={catalogAssetFullUrl(catalogAssets[0].url)}
                      type="application/pdf"
                      title="カタログ PDF"
                      className="chip-detail-catalog-modal__pdf"
                    >
                      <p className="chip-detail-catalog-modal__pdf-fallback">
                        PDF を表示できません。
                        <a
                          href={catalogAssetFullUrl(catalogAssets[0].url)}
                          target="_blank"
                          rel="noreferrer"
                          className="chip-detail-catalog-modal__link"
                        >
                          新しいタブで開く
                        </a>
                      </p>
                    </object>
                  </div>
                </>
              ) : (
                <>
                  <div className="chip-detail-catalog-modal__gallery">
                    {catalogAssets.map((a, i) => (
                      <div key={a.url} className="chip-detail-catalog-modal__gallery-item">
                        <a
                          href={catalogAssetFullUrl(a.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="chip-detail-catalog-modal__img-wrap"
                        >
                          <img
                            src={catalogAssetFullUrl(a.url)}
                            alt={
                              catalogAssets.length > 1
                                ? `カタログ ${a.index ?? i + 1}`
                                : "カタログ"
                            }
                            className="chip-detail-catalog-modal__img"
                          />
                        </a>
                        <p className="chip-detail-catalog-modal__link-wrap">
                          <a
                            href={catalogAssetFullUrl(a.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="chip-detail-catalog-modal__link"
                          >
                            {catalogAssets.length > 1
                              ? `${a.index ?? i + 1}. 新しいタブで開く`
                              : "新しいタブで開く"}
                          </a>
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ConditionSetForm({
  set,
  onChange,
}: {
  set: Partial<ConditionSet>;
  onChange: (s: Partial<ConditionSet>) => void;
}) {
  const update = (key: keyof ConditionSet, value: number | string | undefined) => {
    onChange({ ...set, [key]: value === "" ? undefined : value });
  };
  return (
    <div className="condition-set-form">
      <div className="condition-set-form__row">
        <label>Vc min</label>
        <input
          type="number"
          step="0.1"
          value={set.vcMin ?? ""}
          onChange={(e) =>
            update("vcMin", e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
        <label>Vc max</label>
        <input
          type="number"
          step="0.1"
          value={set.vcMax ?? ""}
          onChange={(e) =>
            update("vcMax", e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      </div>
      <div className="condition-set-form__row">
        <label>送り min</label>
        <input
          type="number"
          step="0.01"
          value={set.feedMin ?? ""}
          onChange={(e) =>
            update("feedMin", e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
        <label>送り max</label>
        <input
          type="number"
          step="0.01"
          value={set.feedMax ?? ""}
          onChange={(e) =>
            update("feedMax", e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      </div>
      <div className="condition-set-form__row">
        <label>ap min</label>
        <input
          type="number"
          step="0.01"
          value={set.apMin ?? ""}
          onChange={(e) =>
            update("apMin", e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
        <label>ap max</label>
        <input
          type="number"
          step="0.01"
          value={set.apMax ?? ""}
          onChange={(e) =>
            update("apMax", e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      </div>
      <div className="condition-set-form__row">
        <label>備考</label>
        <input
          type="text"
          value={set.note ?? ""}
          onChange={(e) => update("note", e.target.value || undefined)}
          placeholder="備考"
        />
      </div>
    </div>
  );
}
