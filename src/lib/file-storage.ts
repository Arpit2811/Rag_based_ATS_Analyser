// IndexedDB-backed Blob storage for session files.
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "ats-rag-files";
const STORE = "files";

let dbPromise: Promise<IDBPDatabase> | null = null;
function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

const key = (sid: string, kind: "resume" | "jd") => `${sid}:${kind}`;

export async function putFile(sid: string, kind: "resume" | "jd", file: File) {
  const db = await getDb();
  await db.put(STORE, file, key(sid, kind));
}

export async function getFile(sid: string, kind: "resume" | "jd") {
  const db = await getDb();
  return (await db.get(STORE, key(sid, kind))) as File | undefined;
}

export async function deleteSessionFiles(sid: string) {
  const db = await getDb();
  await Promise.all([db.delete(STORE, key(sid, "resume")), db.delete(STORE, key(sid, "jd"))]);
}
