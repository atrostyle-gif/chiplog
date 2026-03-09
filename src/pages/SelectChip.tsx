import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilterChips, type FilterState } from "../components/FilterChips";
import { ChipGrid } from "../components/ChipGrid";
import type { Machine, Material, Use, NoseR, Chip } from "../data/chips";
import { listChips } from "../lib/chipStore";
import { ensureChipsSeeded } from "../lib/seedChips";
import { listGrades } from "../lib/gradeStore";
import {
  fetchListChipImageUrls,
  chipImageUrlItemsToMap,
} from "../lib/cloudChipImageUrlClient";
import { logSyncError } from "../lib/syncErrorMessages";

const MACHINES: Machine[] = ["CITIZEN", "NC", "MINI"];
const MATERIALS: Material[] = ["P", "M", "N", "K", "S", "H"];
const USES: Use[] = ["外径", "内径", "溝", "突切", "ネジ", "リア"];
const NOSE_R: NoseR[] = ["0.2", "0.4", "0.8"];

function parseFilterFromSearchParams(
  searchParams: URLSearchParams
): FilterState {
  const machine =
    searchParams.get("machine")?.split(",").filter(Boolean) ?? [];
  const mat = searchParams.get("mat")?.split(",").filter(Boolean) ?? [];
  const use = searchParams.get("use")?.split(",").filter(Boolean) ?? [];
  const r = searchParams.get("r")?.split(",").filter(Boolean) ?? [];

  return {
    machines: machine.filter((m): m is Machine =>
      MACHINES.includes(m as Machine)
    ),
    materials: mat.filter((m): m is Material =>
      MATERIALS.includes(m as Material)
    ),
    uses: use.filter((u): u is Use => USES.includes(u as Use)),
    noseR: r.filter((n): n is NoseR => NOSE_R.includes(n as NoseR)),
  };
}

function filterToSearchParams(filter: FilterState): Record<string, string> {
  const params: Record<string, string> = {};
  if (filter.machines.length > 0) params.machine = filter.machines.join(",");
  if (filter.materials.length > 0) params.mat = filter.materials.join(",");
  if (filter.uses.length > 0) params.use = filter.uses.join(",");
  if (filter.noseR.length > 0) params.r = filter.noseR.join(",");
  return params;
}

function matchesFilter(chip: Chip, filter: FilterState): boolean {
  if (filter.machines.length > 0) {
    const hasMatch = filter.machines.some((m) => chip.machines.includes(m));
    if (!hasMatch) return false;
  }
  if (filter.materials.length > 0) {
    const hasMatch = filter.materials.some((m) => chip.materials.includes(m));
    if (!hasMatch) return false;
  }
  if (filter.uses.length > 0) {
    const hasMatch = filter.uses.some((u) => chip.uses.includes(u));
    if (!hasMatch) return false;
  }
  if (filter.noseR.length > 0) {
    const hasMatch = filter.noseR.some((r) => chip.noseR.includes(r));
    if (!hasMatch) return false;
  }
  return true;
}

export function SelectChip() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allChips, setAllChips] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeCoatingMap, setGradeCoatingMap] = useState<Record<string, string>>(
    {}
  );
  const [cloudChipImageUrls, setCloudChipImageUrls] = useState<
    Record<string, string | null>
  >({});
  const lastListFetchAtRef = useRef(0);
  const LIST_FETCH_GUARD_MS = 800;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureChipsSeeded();
      const [loaded, grades] = await Promise.all([
        listChips(),
        listGrades(),
      ]);
      if (cancelled) return;
      setAllChips(loaded);
      const map: Record<string, string> = {};
      for (const g of grades) {
        map[g.id] = g.coatingShort;
      }
      setGradeCoatingMap(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetchCloudImageUrls = useCallback(() => {
    const now = Date.now();
    if (now - lastListFetchAtRef.current < LIST_FETCH_GUARD_MS) return;
    lastListFetchAtRef.current = now;
    fetchListChipImageUrls().then((result) => {
      if (result.ok) {
        setCloudChipImageUrls(chipImageUrlItemsToMap(result.items));
      } else {
        logSyncError("SelectChip list-chip-image-urls", result.error);
      }
    });
  }, []);

  useEffect(() => {
    refetchCloudImageUrls();
  }, [refetchCloudImageUrls]);

  useEffect(() => {
    const onRefetch = () => {
      refetchCloudImageUrls();
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
  }, [refetchCloudImageUrls]);

  const filter = useMemo(
    () => parseFilterFromSearchParams(searchParams),
    [searchParams]
  );

  const filteredChips = useMemo(() => {
    return allChips.filter((chip) => matchesFilter(chip, filter));
  }, [allChips, filter]);

  const hasAnyFilter =
    filter.machines.length > 0 ||
    filter.materials.length > 0 ||
    filter.uses.length > 0 ||
    filter.noseR.length > 0;

  const handleFilterChange = (next: FilterState) => {
    setSearchParams(filterToSearchParams(next));
  };

  const handleClearAll = () => {
    setSearchParams({});
  };

  return (
    <div className="page select-chip-page">
      <header className="page-header">
        <h1 className="app-logo">CHIPLOG</h1>
        <h2 className="page-title">Select Chip</h2>
      </header>
      <section className="filter-section">
        <div className="filter-section__head">
          <span className="filter-section__label">絞込みフィルター</span>
          {hasAnyFilter && (
            <button
              type="button"
              className="filter-clear-btn"
              onClick={handleClearAll}
            >
              全解除
            </button>
          )}
        </div>
        <FilterChips filter={filter} onChange={handleFilterChange} />
      </section>
      <section className="chip-list-section">
        {loading && (
          <p className="chip-list__count">Loading chips...</p>
        )}
        {hasAnyFilter && (
          <div className="chip-list__filter-summary">
            <div className="chip-list__filter-summary-title">
              現在の絞り込み
            </div>
            <dl className="chip-list__filter-summary-dl">
              {filter.machines.length > 0 && (
                <>
                  <dt>機械</dt>
                  <dd>{filter.machines.join(", ")}</dd>
                </>
              )}
              {filter.materials.length > 0 && (
                <>
                  <dt>材料</dt>
                  <dd>{filter.materials.join(", ")}</dd>
                </>
              )}
              {filter.uses.length > 0 && (
                <>
                  <dt>用途</dt>
                  <dd>{filter.uses.join(", ")}</dd>
                </>
              )}
              {filter.noseR.length > 0 && (
                <>
                  <dt>R</dt>
                  <dd>{filter.noseR.map((r) => `R${r}`).join(", ")}</dd>
                </>
              )}
            </dl>
          </div>
        )}
        {!loading && filteredChips.length === 0 ? (
          <div className="chip-list__empty">
            <p className="chip-list__empty-main">
              該当するチップがありません
            </p>
            <p className="chip-list__empty-sub">
              フィルターを変更してください
            </p>
          </div>
        ) : (
          <>
            <p className="chip-list__count">
              {filteredChips.length} chips found
            </p>
            <ChipGrid
              chips={filteredChips}
              gradeCoatingMap={gradeCoatingMap}
              customImageUrls={cloudChipImageUrls}
            />
          </>
        )}
      </section>
    </div>
  );
}
