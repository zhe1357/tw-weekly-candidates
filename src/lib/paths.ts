import type { RunSummary } from "./public-data";

/** Site root, e.g. "/tw-weekly-candidates/" on GitHub Pages. */
export const BASE = import.meta.env.BASE_URL;
export const homeUrl = (hash = "") => `${BASE}${hash}`;
export const fixedPoolUrl = `${BASE}fixed-pool/`;
export const assetUrl = (path: string) => `${BASE}${path.replace(/^\//, "")}`;

/** Static replacement for GET /api/weeks. */
export async function fetchWeeks(signal?: AbortSignal): Promise<RunSummary[]> {
  const response = await fetch(`${BASE}data/weeks.json`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("無法載入週次清單");
  return await response.json() as RunSummary[];
}

/** Static replacement for GET /api/runs[?id=]: the selected run, else the latest one. */
export async function fetchRun<T>(weeks: RunSummary[], id: string | null | undefined, signal?: AbortSignal): Promise<T> {
  const summary = id ? weeks.find(week => week.id === id) : weeks[0];
  if (!summary) throw new Error("本期名單尚未發布，請稍後再查看。");
  const response = await fetch(`${BASE}data/runs/${summary.file}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 404 ? "本期名單尚未發布，請稍後再查看。" : "資料暫時無法載入，請重新整理。");
  return await response.json() as T;
}
