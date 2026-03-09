import { useState, useEffect, useMemo, useCallback } from "react";
import type { MaterialISO } from "../lib/conditionStore";
import { MATERIAL_ISO_OPTIONS, ISO_LABEL } from "../lib/conditionStore";
import { ensureChipsSeeded } from "../lib/seedChips";
import { ensureCatalogRecommendationsSeeded } from "../lib/seedCatalogRecommendations";
import { listGrades, type GradeEntity } from "../lib/gradeStore";
import { listChips } from "../lib/chipStore";
import {
  upsertCatalogRecommendation,
  deleteCatalogRecommendation,
  listCatalogRecommendations,
  type CatalogRecommendationEntity,
} from "../lib/catalogRecommendationStore";

type FormState = {
  id?: string;
  maker: string;
  grade: string;
  iso: MaterialISO | "";
  useTags: string[];
  breaker: string;
  noseR: string;
  vcMin: string;
  vcMax: string;
  feedMin: string;
  feedMax: string;
  apMin: string;
  apMax: string;
  note: string;
  sourceUrl: string;
};

const USE_TAG_OPTIONS = ["外径", "内径", "溝", "突切", "ネジ", "リア"] as const;
const NOSE_R_OPTIONS = ["", "0.2", "0.4", "0.8"];

const emptyForm: FormState = {
  id: undefined,
  maker: "",
  grade: "",
  iso: "",
  useTags: [],
  breaker: "",
  noseR: "",
  vcMin: "",
  vcMax: "",
  feedMin: "",
  feedMax: "",
  apMin: "",
  apMax: "",
  note: "",
  sourceUrl: "",
};

function formatRange(min?: number, max?: number): string {
  if (min == null && max == null) return "—";
  return `${min ?? "—"}–${max ?? "—"}`;
}

export function RecommendationAdmin() {
  const [grades, setGrades] = useState<GradeEntity[]>([]);
  const [makers, setMakers] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [list, setList] = useState<CatalogRecommendationEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterMaker, setFilterMaker] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterIso, setFilterIso] = useState<MaterialISO | "">("");
  const [filterBreaker, setFilterBreaker] = useState("");
  const [filterNoseR, setFilterNoseR] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureChipsSeeded();
      await ensureCatalogRecommendationsSeeded();
      const [gradeList, chips] = await Promise.all([
        listGrades(),
        listChips(),
      ]);
      if (cancelled) return;
      setGrades(gradeList);
      setMakers(Array.from(new Set(chips.map((c) => c.maker))).sort());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchList = useCallback(async () => {
    const filters: {
      maker?: string;
      grade?: string;
      iso?: MaterialISO;
      breaker?: string;
      noseR?: number;
    } = {};
    if (filterMaker.trim()) filters.maker = filterMaker.trim();
    if (filterGrade.trim()) filters.grade = filterGrade.trim();
    if (filterIso) filters.iso = filterIso as MaterialISO;
    if (filterBreaker.trim() !== "") filters.breaker = filterBreaker.trim();
    if (filterNoseR.trim() !== "") {
      const n = Number(filterNoseR);
      if (!Number.isNaN(n)) filters.noseR = n;
    }
    return listCatalogRecommendations(filters);
  }, [filterMaker, filterGrade, filterIso, filterBreaker, filterNoseR]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetchList()
      .then((recs) => {
        if (!cancelled) setList(recs);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchList]);

  const loadList = useCallback(async () => {
    setLoading(true);
    const recs = await fetchList();
    setList(recs);
    setLoading(false);
  }, [fetchList]);

  const handleFormChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleUseTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      useTags: prev.useTags.includes(tag)
        ? prev.useTags.filter((t) => t !== tag)
        : [...prev.useTags, tag],
    }));
  };

  const handleSelectRecommendation = (rec: CatalogRecommendationEntity) => {
    setForm({
      id: rec.id,
      maker: rec.maker,
      grade: rec.grade,
      iso: rec.iso,
      useTags: rec.useTags ?? [],
      breaker: rec.breaker ?? "",
      noseR: rec.noseR != null ? String(rec.noseR) : "",
      vcMin: rec.vcMin != null ? String(rec.vcMin) : "",
      vcMax: rec.vcMax != null ? String(rec.vcMax) : "",
      feedMin: rec.feedMin != null ? String(rec.feedMin) : "",
      feedMax: rec.feedMax != null ? String(rec.feedMax) : "",
      apMin: rec.apMin != null ? String(rec.apMin) : "",
      apMax: rec.apMax != null ? String(rec.apMax) : "",
      note: rec.note ?? "",
      sourceUrl: rec.sourceUrl ?? "",
    });
  };

  const handleNew = () => {
    setForm((prev) => ({
      ...emptyForm,
      maker: prev.maker || "",
      grade: prev.grade || "",
    }));
  };

  const handleSave = async () => {
    if (!form.maker.trim()) {
      window.alert("メーカーを入力してください");
      return;
    }
    if (!form.grade.trim()) {
      window.alert("材種を入力してください");
      return;
    }
    if (!form.iso) {
      window.alert("ISO を選択してください");
      return;
    }

    const parseNum = (v: string): number | undefined => {
      const trimmed = v.trim();
      if (!trimmed) return undefined;
      const n = Number(trimmed);
      return Number.isNaN(n) ? undefined : n;
    };

    await upsertCatalogRecommendation({
      id: form.id,
      maker: form.maker,
      grade: form.grade,
      iso: form.iso as MaterialISO,
      useTags: form.useTags,
      breaker: form.breaker.trim() || undefined,
      noseR:
        form.noseR.trim() !== ""
          ? Number(form.noseR.trim())
          : undefined,
      vcMin: parseNum(form.vcMin),
      vcMax: parseNum(form.vcMax),
      feedMin: parseNum(form.feedMin),
      feedMax: parseNum(form.feedMax),
      apMin: parseNum(form.apMin),
      apMax: parseNum(form.apMax),
      note: form.note.trim() || undefined,
      source: "catalog",
      sourceUrl: form.sourceUrl.trim() || undefined,
    });

    await loadList();
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("この推奨条件を削除しますか？");
    if (!ok) return;
    await deleteCatalogRecommendation(id);
    await loadList();
    if (form.id === id) {
      handleNew();
    }
  };

  const breakerOptions = useMemo(() => {
    return list
      .map((r) => r.breaker)
      .filter((b): b is string => b != null && b !== "")
      .filter((b, i, arr) => arr.indexOf(b) === i)
      .sort();
  }, [list]);

  return (
    <div className="page recommend-admin-page">
      <header className="page-header">
        <h1 className="app-logo">CHIPLOG</h1>
        <h2 className="page-title">メーカー推奨（カタログ）</h2>
      </header>

      <section className="recommend-admin__filters card">
        <h3 className="recommend-admin__filter-title">フィルタ</h3>
        <div className="recommend-admin__filter-grid">
          <div className="recommend-admin__field">
            <label className="recommend-admin__label">メーカー</label>
            <select
              className="recommend-admin__input"
              value={filterMaker}
              onChange={(e) => setFilterMaker(e.target.value)}
            >
              <option value="">すべて</option>
              {makers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="recommend-admin__field">
            <label className="recommend-admin__label">材種</label>
            <select
              className="recommend-admin__input"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
            >
              <option value="">すべて</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.id}
                </option>
              ))}
            </select>
          </div>
          <div className="recommend-admin__field">
            <label className="recommend-admin__label">ISO</label>
            <select
              className="recommend-admin__input"
              value={filterIso}
              onChange={(e) =>
                setFilterIso(e.target.value as MaterialISO | "")
              }
            >
              <option value="">すべて</option>
              {MATERIAL_ISO_OPTIONS.map((iso) => (
                <option key={iso} value={iso}>
                  {ISO_LABEL[iso]}
                </option>
              ))}
            </select>
          </div>
          <div className="recommend-admin__field">
            <label className="recommend-admin__label">ブレーカー</label>
            <input
              className="recommend-admin__input"
              list="recommend-breakers"
              value={filterBreaker}
              onChange={(e) => setFilterBreaker(e.target.value)}
              placeholder="任意"
            />
            <datalist id="recommend-breakers">
              {breakerOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            <small className="recommend-admin__hint">VNBR02 / VNBR03 / VNBR04 / VNBR05 / VNBR06 / VNBR07 等の型式キー可</small>
          </div>
          <div className="recommend-admin__field">
            <label className="recommend-admin__label">刃先R</label>
            <select
              className="recommend-admin__input"
              value={filterNoseR}
              onChange={(e) => setFilterNoseR(e.target.value)}
            >
              <option value="">すべて</option>
              <option value="0.2">0.2</option>
              <option value="0.4">0.4</option>
              <option value="0.8">0.8</option>
            </select>
          </div>
        </div>
      </section>

      <section className="recommend-admin__main">
        <div className="recommend-admin__list-wrap card">
          <h3 className="recommend-admin__list-title">登録済み一覧</h3>
          {loading ? (
            <p className="recommend-admin__empty">読込中...</p>
          ) : list.length === 0 ? (
            <p className="recommend-admin__empty">条件がありません</p>
          ) : (
            <ul className="recommend-admin__list-body">
              {list.map((rec) => (
                <li key={rec.id} className="recommend-admin__list-item">
                  <button
                    type="button"
                    className={`recommend-admin__list-main ${form.id === rec.id ? "recommend-admin__list-main--active" : ""}`}
                    onClick={() => handleSelectRecommendation(rec)}
                  >
                    <span className="recommend-admin__list-meta">
                      {rec.maker} / {rec.grade} / {ISO_LABEL[rec.iso]}
                    </span>
                    <span className="recommend-admin__list-sub">
                      B: {rec.breaker ?? "—"} R: {rec.noseR != null ? rec.noseR : "—"}
                    </span>
                    <span className="recommend-admin__list-range">
                      Vc {formatRange(rec.vcMin, rec.vcMax)} / f{" "}
                      {formatRange(rec.feedMin, rec.feedMax)} / ap{" "}
                      {formatRange(rec.apMin, rec.apMax)}
                    </span>
                    {rec.sourceUrl ? (
                      <span className="recommend-admin__list-link" title="sourceUrlあり">🔗</span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="recommend-admin__list-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(rec.id);
                    }}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="recommend-admin__form card">
          <h3 className="recommend-admin__form-title">編集</h3>
          <div className="recommend-admin__form-grid">
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">メーカー</label>
              <select
                className="recommend-admin__input"
                value={form.maker}
                onChange={(e) => handleFormChange("maker", e.target.value)}
              >
                <option value="">選択</option>
                {makers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">材種</label>
              <select
                className="recommend-admin__input"
                value={form.grade}
                onChange={(e) => handleFormChange("grade", e.target.value)}
              >
                <option value="">選択</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">ISO</label>
              <select
                className="recommend-admin__input"
                value={form.iso}
                onChange={(e) =>
                  handleFormChange("iso", e.target.value as MaterialISO | "")
                }
              >
                <option value="">選択</option>
                {MATERIAL_ISO_OPTIONS.map((iso) => (
                  <option key={iso} value={iso}>
                    {ISO_LABEL[iso]}
                  </option>
                ))}
              </select>
            </div>
            <div className="recommend-admin__field recommend-admin__field--full">
              <span className="recommend-admin__label">用途タグ</span>
              <div className="recommend-admin__chips">
                {USE_TAG_OPTIONS.map((t) => (
                  <label key={t} className="recommend-admin__chip">
                    <input
                      type="checkbox"
                      checked={form.useTags.includes(t)}
                      onChange={() => toggleUseTag(t)}
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">ブレーカー</label>
              <input
                className="recommend-admin__input"
                list="form-breakers"
                value={form.breaker}
                onChange={(e) => handleFormChange("breaker", e.target.value)}
                placeholder="空で汎用"
              />
              <datalist id="form-breakers">
                {breakerOptions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <small className="recommend-admin__hint">VNBR02 / VNBR03 / VNBR04 / VNBR05 / VNBR06 / VNBR07 等の型式キー可</small>
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">刃先R (mm)</label>
              <select
                className="recommend-admin__input"
                value={form.noseR}
                onChange={(e) => handleFormChange("noseR", e.target.value)}
              >
                {NOSE_R_OPTIONS.map((v) => (
                  <option key={v || "any"} value={v}>
                    {v || "汎用"}
                  </option>
                ))}
              </select>
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">Vc min</label>
              <input
                className="recommend-admin__input"
                type="number"
                step="0.1"
                value={form.vcMin}
                onChange={(e) => handleFormChange("vcMin", e.target.value)}
              />
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">Vc max</label>
              <input
                className="recommend-admin__input"
                type="number"
                step="0.1"
                value={form.vcMax}
                onChange={(e) => handleFormChange("vcMax", e.target.value)}
              />
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">f min</label>
              <input
                className="recommend-admin__input"
                type="number"
                step="0.01"
                value={form.feedMin}
                onChange={(e) => handleFormChange("feedMin", e.target.value)}
              />
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">f max</label>
              <input
                className="recommend-admin__input"
                type="number"
                step="0.01"
                value={form.feedMax}
                onChange={(e) => handleFormChange("feedMax", e.target.value)}
              />
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">ap min</label>
              <input
                className="recommend-admin__input"
                type="number"
                step="0.01"
                value={form.apMin}
                onChange={(e) => handleFormChange("apMin", e.target.value)}
              />
            </div>
            <div className="recommend-admin__field">
              <label className="recommend-admin__label">ap max</label>
              <input
                className="recommend-admin__input"
                type="number"
                step="0.01"
                value={form.apMax}
                onChange={(e) => handleFormChange("apMax", e.target.value)}
              />
            </div>
            <div className="recommend-admin__field recommend-admin__field--full">
              <label className="recommend-admin__label">note</label>
              <input
                className="recommend-admin__input"
                type="text"
                value={form.note}
                onChange={(e) => handleFormChange("note", e.target.value)}
                placeholder="仕上げ/中切削/湿式など"
              />
            </div>
            <div className="recommend-admin__field recommend-admin__field--full">
              <label className="recommend-admin__label">source URL</label>
              <input
                className="recommend-admin__input"
                type="url"
                value={form.sourceUrl}
                onChange={(e) => handleFormChange("sourceUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="recommend-admin__actions">
            <button type="button" className="btn-primary" onClick={handleSave}>
              保存
            </button>
            <button type="button" className="btn-secondary" onClick={handleNew}>
              新規
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
