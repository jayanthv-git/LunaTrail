import type { MediaConfig } from "../config/scenes";
type StoredMedia = {
  mode: MediaConfig["mode"];
  files: File[];
  heroHasText: boolean;
};
function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("lunatrail-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("media");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveMedia(value: StoredMedia | null) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    if (value) tx.objectStore("media").put(value, "active");
    else tx.objectStore("media").delete("active");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function restoreMedia() {
  const db = await database();
  const value = await new Promise<StoredMedia | undefined>(
    (resolve, reject) => {
      const r = db.transaction("media").objectStore("media").get("active");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    },
  );
  db.close();
  return value;
}
export function configFromFiles(value: StoredMedia): MediaConfig {
  const urls = value.files.map((file) => URL.createObjectURL(file));
  return value.mode === "video"
    ? { mode: "video", src: urls[0], heroHasText: value.heroHasText }
    : { mode: value.mode, sources: urls, heroHasText: value.heroHasText };
}
export function releaseMedia(config: MediaConfig) {
  const urls = config.mode === "video" ? [config.src] : config.sources;
  urls.filter((url) => url.startsWith("blob:")).forEach(URL.revokeObjectURL);
}
