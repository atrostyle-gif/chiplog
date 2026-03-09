import { useState } from "react";
import type { Machine, Material, Use, NoseR } from "../data/chips";

const MACHINES: { value: Machine; label: string }[] = [
  { value: "CITIZEN", label: "CITIZEN" },
  { value: "NC", label: "NC" },
  { value: "MINI", label: "MINI" },
  { value: "MC", label: "MC" },
];

const MATERIALS: { value: Material; label: string }[] = [
  { value: "P", label: "P(鋼)" },
  { value: "M", label: "M(SUS)" },
  { value: "N", label: "N(非鉄)" },
  { value: "K", label: "K(鋳鉄)" },
  { value: "S", label: "S(難削材)" },
  { value: "H", label: "H(焼入材)" },
];

const USES: { value: Use; label: string }[] = [
  { value: "外径", label: "外径" },
  { value: "内径", label: "内径" },
  { value: "溝", label: "溝" },
  { value: "突切", label: "突切" },
  { value: "ネジ", label: "ネジ" },
  { value: "リア", label: "リア" },
];

const NOSE_R: { value: NoseR; label: string }[] = [
  { value: "0.2", label: "R0.2" },
  { value: "0.4", label: "R0.4" },
  { value: "0.8", label: "R0.8" },
];

export interface FilterState {
  machines: Machine[];
  materials: Material[];
  uses: Use[];
  noseR: NoseR[];
}

export type FilterCategoryKey = keyof FilterState;

const CATEGORY_LABELS: Record<FilterCategoryKey, string> = {
  machines: "機械",
  materials: "被削材",
  uses: "用途",
  noseR: "刃先R",
};

const DEFAULT_OPEN: Record<FilterCategoryKey, boolean> = {
  machines: false,
  materials: true,
  uses: true,
  noseR: false,
};

interface FilterChipsProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
}

function toggle<T>(arr: T[], value: T): T[] {
  if (arr.includes(value)) return arr.filter((v) => v !== value);
  return [...arr, value];
}

export function FilterChips({ filter, onChange }: FilterChipsProps) {
  const [open, setOpen] = useState<Record<FilterCategoryKey, boolean>>(
    () => DEFAULT_OPEN
  );

  const togglePanel = (key: FilterCategoryKey) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="filter-block">
      <div className="filter-accordion">
        <button
          type="button"
          className={`filter-accordion__trigger ${open.machines ? "filter-accordion__trigger--open" : ""}`}
          onClick={() => togglePanel("machines")}
          aria-expanded={open.machines}
        >
          <span className="filter-accordion__icon">▼</span>
          {CATEGORY_LABELS.machines}
        </button>
        {open.machines && (
          <div className="filter-accordion__body">
            <div className="filter-buttons">
              {MACHINES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-btn ${filter.machines.includes(value) ? "filter-btn--active" : ""}`}
                  onClick={() =>
                    onChange({
                      ...filter,
                      machines: toggle(filter.machines, value),
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`filter-accordion__trigger ${open.materials ? "filter-accordion__trigger--open" : ""}`}
          onClick={() => togglePanel("materials")}
          aria-expanded={open.materials}
        >
          <span className="filter-accordion__icon">▼</span>
          {CATEGORY_LABELS.materials}
        </button>
        {open.materials && (
          <div className="filter-accordion__body">
            <div className="filter-buttons">
              {MATERIALS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-btn ${filter.materials.includes(value) ? "filter-btn--active" : ""}`}
                  onClick={() =>
                    onChange({
                      ...filter,
                      materials: toggle(filter.materials, value),
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`filter-accordion__trigger ${open.uses ? "filter-accordion__trigger--open" : ""}`}
          onClick={() => togglePanel("uses")}
          aria-expanded={open.uses}
        >
          <span className="filter-accordion__icon">▼</span>
          {CATEGORY_LABELS.uses}
        </button>
        {open.uses && (
          <div className="filter-accordion__body">
            <div className="filter-buttons">
              {USES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-btn ${filter.uses.includes(value) ? "filter-btn--active" : ""}`}
                  onClick={() =>
                    onChange({
                      ...filter,
                      uses: toggle(filter.uses, value),
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`filter-accordion__trigger ${open.noseR ? "filter-accordion__trigger--open" : ""}`}
          onClick={() => togglePanel("noseR")}
          aria-expanded={open.noseR}
        >
          <span className="filter-accordion__icon">▼</span>
          {CATEGORY_LABELS.noseR}
        </button>
        {open.noseR && (
          <div className="filter-accordion__body">
            <div className="filter-buttons">
              {NOSE_R.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-btn ${filter.noseR.includes(value) ? "filter-btn--active" : ""}`}
                  onClick={() =>
                    onChange({
                      ...filter,
                      noseR: toggle(filter.noseR, value),
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
