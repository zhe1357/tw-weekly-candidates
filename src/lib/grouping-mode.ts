import type { Snapshot } from "./public-data";
import { selectSnapshot } from "./selection.ts";
import { HISTORICAL_CONFIG } from "./historical-config.ts";

export type GroupingMode = "historical" | "manual";
export type Strategy = "classification" | "regression" | "intersection";
export type ViewTab = Strategy | "all";
export const STRATEGY_LABELS = { classification: "分類模型", regression: "報酬模型", intersection: "雙模型交集", all: "全部有效標的" } as const;
export const COMPARISON = { start: "2026-01-01", end: "2026-09-30", weeks: 36, basis: "2025-12-31" } as const;

export function presetAvailability(snapshot: Snapshot, poolSize: number): string | null {
  if (snapshot.poolMode !== "fixed" || snapshot.marketCapBasisDate !== COMPARISON.basis)
    return "此快照不使用 2025 年底固定池，請使用手動設定。";
  if (snapshot.modelPeriod !== "2000_2019") return "此模型沒有對應歷史配置，請使用手動設定。";
  if (snapshot.signalDate <= COMPARISON.end) return "此快照尚未超過歷史比較期間，請使用手動設定。";
  if (!Object.hasOwn(HISTORICAL_CONFIG, poolSize)) return "此 Top N 尚無對應歷史配置，已使用手動設定；不套用鄰近股票池。";
  return null;
}

export function groupingView<T extends Snapshot>(source: T, poolSize: number, manualGroups: number, mode: GroupingMode, tab: ViewTab) {
  const unavailable = mode === "historical" ? presetAvailability(source, poolSize) : null;
  const preset = mode === "historical" && !unavailable && tab !== "all"
    ? HISTORICAL_CONFIG[String(poolSize) as keyof typeof HISTORICAL_CONFIG][tab] : null;
  const groupCount = tab === "all" ? 1 : preset?.groups ?? manualGroups;
  try {
    return { snapshot: selectSnapshot(source, poolSize, groupCount), groupCount, preset, notice: unavailable, error: null };
  } catch (error) {
    // An invalid historical group count must not be capped or silently replaced.
    return { snapshot: null, groupCount, preset, notice: unavailable,
      error: error instanceof Error ? error.message : "無法套用分組，請改用手動設定。" };
  }
}

export function groupingViews<T extends Snapshot>(source: T, poolSize: number, manualGroups: number, mode: GroupingMode) {
  return {
    classification: groupingView(source, poolSize, manualGroups, mode, "classification"),
    regression: groupingView(source, poolSize, manualGroups, mode, "regression"),
    intersection: groupingView(source, poolSize, manualGroups, mode, "intersection"),
    all: groupingView(source, poolSize, manualGroups, mode, "all"),
  };
}
