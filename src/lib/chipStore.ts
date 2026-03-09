import { db, type ChipEntity } from "./db";
import {
  parseBreakerFromCode,
  parseNoseRmmFromCode,
  parseShapeFromCode,
} from "./chipCodeParser";
import { resolveChipImageUrl } from "./imageResolver";
import type { Chip, NoseR, Material, Use, Machine } from "../data/chips";

function chipId(maker: string, code: string): string {
  return `${maker}:${code.trim()}`;
}

function hydrateChip(entity: ChipEntity): Chip {
  const maker = entity.maker.trim();
  const code = entity.code.trim();
  const noseRmm =
    entity.noseRmm ?? parseNoseRmmFromCode(code);
  const noseR: NoseR[] =
    noseRmm != null ? [noseRmm.toFixed(1) as NoseR] : [];
  const breakerCode =
    entity.breakerCode ?? parseBreakerFromCode(code);
  const shape = parseShapeFromCode(code);
  const shapeLabel = entity.shapeLabelOverride ?? shape.label;
  const imageUrl = (() => {
    const cloudUrl = entity.imageUrl?.trim();
    if (cloudUrl) return cloudUrl;
    const path = entity.imagePath?.trim();
    if (path && !/^chips\/VNBR/i.test(path)) {
      return `/${path}`;
    }
    return resolveChipImageUrl(maker, code);
  })();
  const machines = (entity.machines ?? []) as Machine[];
  const features = entity.features ?? [];
  const applications = entity.applications ?? [];

  return {
    id: entity.id,
    maker,
    code,
    gradeId: entity.gradeId,
    uses: (entity.uses ?? []) as Use[],
    materials: (entity.materials ?? []) as Material[],
    noseRmm,
    noseR,
    breakerCode: breakerCode ?? null,
    shapeKey: shape.key,
    shapeLabel,
    imageUrl,
    machines,
    features,
    applications,
  };
}

export async function listChips(): Promise<Chip[]> {
  const all = await db.chips.orderBy("updatedAt").reverse().toArray();
  return all.map(hydrateChip);
}

export interface ChipSearchParams {
  keyword?: string;
  maker?: string;
  gradeId?: string;
}

export async function searchChips(params: ChipSearchParams): Promise<Chip[]> {
  const all = await listChips();
  const keyword = params.keyword?.trim();
  let filtered = all;

  if (params.maker) {
    filtered = filtered.filter((c) => c.maker === params.maker);
  }
  if (params.gradeId) {
    filtered = filtered.filter((c) => c.gradeId === params.gradeId);
  }
  if (keyword) {
    const lower = keyword.toLowerCase();
    const prefix = filtered.filter((c) =>
      c.code.toLowerCase().startsWith(lower)
    );
    const partial = filtered.filter(
      (c) =>
        !c.code.toLowerCase().startsWith(lower) &&
        c.code.toLowerCase().includes(lower)
    );
    const seen = new Set<string>();
    const ordered: Chip[] = [];
    for (const c of [...prefix, ...partial]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      ordered.push(c);
    }
    return ordered;
  }

  return filtered;
}

export async function getChipById(id: string): Promise<Chip | undefined> {
  const entity = await db.chips.get(id);
  return entity ? hydrateChip(entity) : undefined;
}

export type ChipUpsertInput = Omit<
  ChipEntity,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

export async function upsertChip(input: ChipUpsertInput): Promise<ChipEntity> {
  const maker = input.maker.trim();
  const code = input.code.trim();
  if (!maker) throw new Error("メーカーを入力してください");
  if (!code) throw new Error("型番を入力してください");

  const id = input.id ?? chipId(maker, code);
  const existing = await db.chips.get(id);
  const now = new Date().toISOString();

  const entity: ChipEntity = {
    id,
    maker,
    code,
    gradeId: input.gradeId,
    uses: input.uses ?? [],
    materials: input.materials ?? [],
    machines: input.machines ?? existing?.machines ?? [],
    features: input.features ?? existing?.features ?? [],
    applications: input.applications ?? existing?.applications ?? [],
    shapeLabelOverride: input.shapeLabelOverride ?? existing?.shapeLabelOverride,
    noseRmm: input.noseRmm ?? null,
    breakerCode: input.breakerCode ?? null,
    imagePath: "imagePath" in input ? input.imagePath : existing?.imagePath,
    imageUrl: "imageUrl" in input ? input.imageUrl : existing?.imageUrl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.chips.put(entity);
  return entity;
}

export async function deleteChip(id: string): Promise<void> {
  await db.chips.delete(id);
}

