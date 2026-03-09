import { db, type ChipEntity, type GradeEntity, type BreakerEntity } from "./db";
import { GRADES } from "../data/grades";
import { BREAKERS } from "../data/breakers";
import { chips } from "../data/chips";

const SEED_FLAG_KEY = "chiplog_seed_chips_v1";

export async function ensureChipsSeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_FLAG_KEY) === "done") return;

  const now = new Date().toISOString();

  await db.transaction(
    "rw",
    db.grades,
    db.breakers,
    db.chips,
    async () => {
      // Grades
      for (const g of GRADES) {
        const existing = await db.grades.get(g.id);
        if (existing) continue;
        const entity: GradeEntity = {
          id: g.id,
          maker: g.maker,
          name: g.name,
          coatingShort: g.coatingShort,
          coatingDetail: g.coatingDetail,
          recommendedMaterials: g.recommendedMaterials,
          createdAt: now,
          updatedAt: now,
        };
        await db.grades.add(entity);
      }

      // Breakers
      for (const b of BREAKERS) {
        const existing = await db.breakers.get(b.id);
        if (existing) continue;
        const entity: BreakerEntity = {
          id: b.id,
          maker: b.maker,
          code: b.code,
          name: b.name,
          detail: b.detail,
          typicalUses: b.typicalUses,
          sourceNote: b.sourceNote,
          createdAt: now,
          updatedAt: now,
        };
        await db.breakers.add(entity);
      }

      // Chips
      for (const c of chips) {
        const existing = await db.chips.get(c.id);
        if (existing) continue;
        const entity: ChipEntity = {
          id: c.id,
          maker: c.maker,
          code: c.code,
          gradeId: c.gradeId,
          uses: c.uses,
          materials: c.materials,
          machines: [],
          noseRmm: c.noseRmm,
          breakerCode: c.breakerCode ?? null,
          features: c.features,
          applications: c.applications,
          createdAt: now,
          updatedAt: now,
        };
        await db.chips.add(entity);
      }
    }
  );

  window.localStorage.setItem(SEED_FLAG_KEY, "done");
}

