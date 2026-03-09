import { openDB } from "idb";

const DB_NAME = "chiplog-images";
const DB_VERSION = 1;
const STORE_NAME = "chipImages";

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function setChipImage(chipId: string, file: File): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.put(file, chipId);
  await tx.done;
}

export async function getChipImageBlob(chipId: string): Promise<Blob | null> {
  const db = await getDB();
  const blob = await db.get(STORE_NAME, chipId);
  if (blob instanceof Blob) return blob;
  return null;
}

export async function deleteChipImage(chipId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.delete(chipId);
  await tx.done;
}
