import {
  PENDING_IMPORT_KEY,
  type PendingImportAsset,
  type PendingImportPayload,
  type ImportBrokerId,
} from "@/lib/import/types";

export function savePendingImport(
  broker: ImportBrokerId,
  assets: PendingImportAsset[],
  fileName?: string,
) {
  const payload: PendingImportPayload = {
    broker,
    fileName,
    assets,
    createdAt: new Date().toISOString(),
  };
  sessionStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify(payload));
}

export function loadPendingImport(): PendingImportPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_IMPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingImportPayload;
    if (!parsed?.assets?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingImport() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_IMPORT_KEY);
}

export async function screenInBatches<T, R>(
  items: T[],
  screenOne: (item: T) => Promise<R>,
  batchSize = 3,
  delayMs = 500,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((item) => screenOne(item)));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}
