import { useEffect, useMemo, useState, useCallback } from "react";
import type { Chip, Material, Use, Machine } from "../data/chips";
import { listChips, upsertChip, deleteChip } from "../lib/chipStore";
import { listGrades, type GradeEntity } from "../lib/gradeStore";
import { ensureChipsSeeded } from "../lib/seedChips";
import { parseNoseRmmFromCode, parseBreakerFromCode } from "../lib/chipCodeParser";
import {
  getChipImageBlob,
  setChipImage,
  deleteChipImage,
} from "../lib/imageStore";
import { ISO_LABEL, type MaterialISO } from "../lib/conditionStore";

const USE_OPTIONS: Use[] = ["外径", "内径", "溝", "突切", "ネジ", "リア"];
const MATERIAL_OPTIONS: Material[] = ["P", "M", "N", "K", "S", "H"];
const MACHINE_OPTIONS: Machine[] = ["CITIZEN", "NC", "MINI"];

type ChipFormState = {
  id?: string;
  maker: string;
  code: string;
  gradeId: string;
  uses: Use[];
  materials: Material[];
  machines: Machine[];
  noseRmm: string;
  breakerCode: string;
};

const emptyForm: ChipFormState = {
  id: undefined,
  maker: "",
  code: "",
  gradeId: "",
  uses: [],
  materials: [],
  machines: [],
  noseRmm: "",
  breakerCode: "",
};

function chipIdFromForm(form: ChipFormState): string | null {
  const maker = form.maker.trim();
  const code = form.code.trim();
  if (!maker || !code) return null;
  return `${maker}:${code}`;
}

export function ChipAdmin() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [grades, setGrades] = useState<GradeEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [filterMaker, setFilterMaker] = useState("");
  const [filterGradeId, setFilterGradeId] = useState("");
  const [filterMachines, setFilterMachines] = useState<Machine[]>([]);

  const [form, setForm] = useState<ChipFormState>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureChipsSeeded();
      const [loadedChips, loadedGrades] = await Promise.all([
        listChips(),
        listGrades(),
      ]);
      if (cancelled) return;
      setChips(loadedChips);
      setGrades(loadedGrades);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const makers = useMemo(
    () => Array.from(new Set(chips.map((c) => c.maker))).sort(),
    [chips]
  );

  const filteredChips = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return chips.filter((chip) => {
      if (filterMaker && chip.maker !== filterMaker) return false;
      if (filterGradeId && chip.gradeId !== filterGradeId) return false;
      if (filterMachines.length > 0) {
        if (!chip.machines || chip.machines.length === 0) return false;
        const hasMachine = chip.machines.some((m) =>
          filterMachines.includes(m)
        );
        if (!hasMachine) return false;
      }
      if (kw) {
        const codeLower = chip.code.toLowerCase();
        if (!codeLower.startsWith(kw) && !codeLower.includes(kw)) return false;
      }
      return true;
    });
  }, [chips, keyword, filterMaker, filterGradeId, filterMachines]);

  const handleSelectChip = useCallback(
    async (chip: Chip) => {
      setSelectedId(chip.id);
      setForm({
        id: chip.id,
        maker: chip.maker,
        code: chip.code,
        gradeId: chip.gradeId,
        uses: chip.uses,
        materials: chip.materials,
        machines: chip.machines ?? [],
        noseRmm: chip.noseRmm != null ? String(chip.noseRmm) : "",
        breakerCode: chip.breakerCode ?? "",
      });

      const blob = await getChipImageBlob(chip.id);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (blob) {
        const url = URL.createObjectURL(blob);
        setImagePreviewUrl(url);
      } else {
        setImagePreviewUrl(null);
      }
    },
    [imagePreviewUrl]
  );

  const handleNew = () => {
    setSelectedId(null);
    setForm(emptyForm);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  const handleFormChange = <K extends keyof ChipFormState>(
    key: K,
    value: ChipFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleUse = (use: Use) => {
    setForm((prev) => ({
      ...prev,
      uses: prev.uses.includes(use)
        ? prev.uses.filter((u) => u !== use)
        : [...prev.uses, use],
    }));
  };

  const handleToggleMaterial = (mat: Material) => {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.includes(mat)
        ? prev.materials.filter((m) => m !== mat)
        : [...prev.materials, mat],
    }));
  };

  const handleToggleMachineFilter = (machine: Machine) => {
    setFilterMachines((prev) =>
      prev.includes(machine) ? prev.filter((m) => m !== machine) : [...prev, machine]
    );
  };

  const handleToggleMachine = (machine: Machine) => {
    setForm((prev) => ({
      ...prev,
      machines: prev.machines.includes(machine)
        ? prev.machines.filter((m) => m !== machine)
        : [...prev.machines, machine],
    }));
  };

  const handleAutoNoseR = () => {
    const value = parseNoseRmmFromCode(form.code);
    handleFormChange("noseRmm", value != null ? String(value) : "");
  };

  const handleAutoBreaker = () => {
    const value = parseBreakerFromCode(form.code);
    handleFormChange("breakerCode", value ?? "");
  };

  const handleSave = async () => {
    const noseRmm =
      form.noseRmm.trim() !== "" ? Number(form.noseRmm.trim()) : null;
    if (Number.isNaN(noseRmm)) {
      throw new Error("刃先Rは数値で入力してください");
    }
    const entity = await upsertChip({
      id: form.id,
      maker: form.maker,
      code: form.code,
      gradeId: form.gradeId,
      uses: form.uses,
      materials: form.materials,
      machines: form.machines,
      noseRmm,
      breakerCode: form.breakerCode || null,
    });
    const updatedChips = await listChips();
    setChips(updatedChips);
    setSelectedId(entity.id);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = window.confirm("このチップを削除しますか？");
    if (!ok) return;
    await deleteChip(selectedId);
    const updatedChips = await listChips();
    setChips(updatedChips);
    handleNew();
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const chipId = chipIdFromForm(form);
    if (!file || !chipId) return;
    await setChipImage(chipId, file);
    const blob = await getChipImageBlob(chipId);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      setImagePreviewUrl(url);
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleImageDelete = async () => {
    const chipId = chipIdFromForm(form);
    if (!chipId) return;
    await deleteChipImage(chipId);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  const materialLabel = (m: Material): string =>
    ISO_LABEL[m as MaterialISO] ?? m;

  return (
    <div className="page chip-admin-page">
      <header className="page-header">
        <h1 className="app-logo">CHIPLOG</h1>
        <h2 className="page-title">Chip Admin</h2>
      </header>

      <section className="chip-admin__search">
        <div className="chip-admin__filters">
          <div className="chip-admin__filter-item">
            <label>
              キーワード
              <input
                className="chip-admin__input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="型番で検索"
              />
            </label>
          </div>
          <div className="chip-admin__filter-item">
            <label>
              機械
              <div className="chip-admin__checkbox-row">
                {MACHINE_OPTIONS.map((m) => (
                  <label key={m} className="chip-admin__checkbox-label">
                    <input
                      type="checkbox"
                      checked={filterMachines.includes(m)}
                      onChange={() => handleToggleMachineFilter(m)}
                    />
                    {m}
                  </label>
                ))}
              </div>
            </label>
          </div>
          <div className="chip-admin__filter-item">
            <label>
              メーカー
              <select
                className="chip-admin__select"
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
            </label>
          </div>
          <div className="chip-admin__filter-item">
            <label>
              材種
              <select
                className="chip-admin__select"
                value={filterGradeId}
                onChange={(e) => setFilterGradeId(e.target.value)}
              >
                <option value="">すべて</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="chip-admin__main">
        <div className="chip-admin__list">
          <div className="chip-admin__list-header">
            <span>チップ一覧</span>
            <span className="chip-admin__list-count">
              {filteredChips.length} 件
            </span>
          </div>
          <div className="chip-admin__list-body">
            {loading ? (
              <p className="chip-admin__empty">Loading...</p>
            ) : filteredChips.length === 0 ? (
              <p className="chip-admin__empty">チップがありません</p>
            ) : (
              <ul>
                {filteredChips.map((chip) => (
                  <li key={chip.id}>
                    <button
                      type="button"
                      className={`chip-admin__list-item ${
                        chip.id === selectedId
                          ? "chip-admin__list-item--active"
                          : ""
                      }`}
                      onClick={() => handleSelectChip(chip)}
                    >
                      <span className="chip-admin__list-code">
                        {chip.code}
                      </span>
                      <span className="chip-admin__list-grade">
                        {chip.gradeId}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="btn-secondary chip-admin__new-btn"
            onClick={handleNew}
          >
            新規チップ
          </button>
        </div>

        <div className="chip-admin__form">
          <h3 className="chip-admin__form-title">チップ編集</h3>
          <div className="chip-admin__form-grid">
            <div className="form-field span-6">
              <label>
                メーカー<span className="required">*</span>
              </label>
              <input
                className="chip-admin__input"
                value={form.maker}
                onChange={(e) => handleFormChange("maker", e.target.value)}
              />
            </div>
            <div className="form-field span-6">
              <label>
                型番<span className="required">*</span>
              </label>
              <input
                className="chip-admin__input"
                value={form.code}
                onChange={(e) => handleFormChange("code", e.target.value)}
              />
            </div>
            <div className="form-field span-6">
              <label>
                材種ID<span className="required">*</span>
              </label>
              <select
                className="chip-admin__select"
                value={form.gradeId}
                onChange={(e) => handleFormChange("gradeId", e.target.value)}
              >
                <option value="">選択してください</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field span-6">
              <label>用途</label>
              <div className="chip-admin__checkbox-row">
                {USE_OPTIONS.map((u) => (
                  <label key={u} className="chip-admin__checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.uses.includes(u)}
                      onChange={() => handleToggleUse(u)}
                    />
                    {u}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-field span-6">
              <label>被削材</label>
              <div className="chip-admin__checkbox-row">
                {MATERIAL_OPTIONS.map((m) => (
                  <label key={m} className="chip-admin__checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.materials.includes(m)}
                      onChange={() => handleToggleMaterial(m)}
                    />
                    {materialLabel(m)}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-field span-6">
              <label>機械</label>
              <div className="chip-admin__checkbox-row">
                {MACHINE_OPTIONS.map((m) => (
                  <label key={m} className="chip-admin__checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.machines.includes(m)}
                      onChange={() => handleToggleMachine(m)}
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-field span-3">
              <label>刃先R (mm)</label>
              <div className="form-field__inline">
                <input
                  className="chip-admin__input"
                  value={form.noseRmm}
                  onChange={(e) => handleFormChange("noseRmm", e.target.value)}
                />
                <button
                  type="button"
                  className="btn-inline-add"
                  onClick={handleAutoNoseR}
                >
                  自動計算
                </button>
              </div>
            </div>

            <div className="form-field span-3">
              <label>ブレーカー</label>
              <div className="form-field__inline">
                <input
                  className="chip-admin__input"
                  value={form.breakerCode}
                  onChange={(e) =>
                    handleFormChange("breakerCode", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="btn-inline-add"
                  onClick={handleAutoBreaker}
                >
                  自動抽出
                </button>
              </div>
            </div>

            <div className="form-field span-6">
              <label>写真</label>
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="chip"
                  className="chip-admin__image-preview"
                />
              )}
              <div className="chip-admin__image-actions">
                <input
                  id="chip-admin-image-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="chip-detail__file-input"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  className="btn-chip-img"
                  onClick={() =>
                    document
                      .getElementById("chip-admin-image-input")
                      ?.click()
                  }
                >
                  写真を変更
                </button>
                <button
                  type="button"
                  className="btn-chip-img-secondary"
                  onClick={handleImageDelete}
                  disabled={!imagePreviewUrl}
                >
                  写真を削除
                </button>
              </div>
            </div>
          </div>

          <div className="chip-admin__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
            >
              保存
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleDelete}
              disabled={!selectedId}
            >
              削除
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

