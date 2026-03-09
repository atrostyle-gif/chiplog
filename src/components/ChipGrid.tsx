import { Link } from "react-router-dom";
import type { Chip } from "../data/chips";
import { getDisplayImageUrl } from "../lib/imageResolver";
import noImage from "../assets/no-image.png";

interface ChipGridProps {
  chips: Chip[];
  gradeCoatingMap?: Record<string, string>;
  /** クラウド（Turso）画像URL。undefined=未取得, null=取得済み・画像なし, string=取得済み・画像あり */
  customImageUrls?: Record<string, string | null>;
}

export function ChipGrid({
  chips,
  gradeCoatingMap,
  customImageUrls = {},
}: ChipGridProps) {
  return (
    <div className="chip-grid">
      {chips.map((chip) => {
        const coatingShort = gradeCoatingMap?.[chip.gradeId];
        const raw = customImageUrls[chip.id];
        const displayImageUrl = getDisplayImageUrl(
          raw,
          chip.imageUrl,
          noImage
        );
        return (
          <Link key={chip.id} to={`/chip/${chip.id}`} className="chip-card">
            <div className="chip-card__image-wrap">
              <img
                src={displayImageUrl}
                alt={chip.code}
                className="chip-card__image"
                onError={(e) => {
                  e.currentTarget.src = noImage;
                }}
              />
            </div>
            <div className="chip-card__code">{chip.code}</div>
            <div className="chip-card__grade">{chip.gradeId}</div>
            {coatingShort && (
              <div className="chip-card__coating">{coatingShort}</div>
            )}
            {(chip.shapeLabel || chip.noseRmm != null || chip.breakerCode) && (
              <div className="chip-card__meta">
                {chip.shapeLabel}
                {chip.noseRmm != null && ` / R${chip.noseRmm}`}
                {chip.breakerCode && ` / ${chip.breakerCode}`}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
