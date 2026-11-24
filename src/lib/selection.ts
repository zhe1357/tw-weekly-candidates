import type { Snapshot, Stock } from "./public-data";

const tickerOrder = (a: Stock, b: Stock) => a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0;

export function maximumPoolSize(snapshot: Snapshot): number {
  return snapshot.universeRows && snapshot.universeCount ? snapshot.universeCount : snapshot.poolSize ?? snapshot.rows.length;
}

function balancedGroups(rows: Stock[], groups: number, score: "probability" | "predictedReturn",
  rank: "probabilityRank" | "returnRank", group: "probabilityGroup" | "returnGroup") {
  const ordered = [...rows].sort((a, b) => b[score] - a[score] || tickerOrder(a, b));
  const base = Math.floor(ordered.length / groups), extra = ordered.length % groups;
  const first = extra * (base + 1);
  ordered.forEach((row, i) => {
    row[rank] = i + 1;
    row[group] = i < first ? Math.floor(i / (base + 1)) + 1 : extra + Math.floor((i - first) / base) + 1;
  });
}

/** Match Python rank_groups: score descending, ticker ascending, np.array_split. */
export function selectSnapshot<T extends Snapshot>(snapshot: T, poolSize: number, groupCount: number): T {
  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > maximumPoolSize(snapshot))
    throw new Error(`股票池須為 1 至 ${maximumPoolSize(snapshot)} 的整數。`);
  if (!Number.isInteger(groupCount) || groupCount < 1) throw new Error("組數須為正整數。");
  const universe = snapshot.universeRows ?? snapshot.rows;
  if (universe.some(row => row.marketCapRank === null)) throw new Error("這一期缺少完整市值順位，無法調整股票池。");
  // Full-universe ranks are preserved: invalid image ranks leave gaps. Never
  // replace a missing top-N image with the N+1 company.
  const rows = universe.filter(row => row.marketCapRank! <= poolSize).map(row => ({ ...row }));
  if (rows.length === 0) throw new Error("此股票池沒有符合模型影像條件的標的。");
  if (groupCount > rows.length) throw new Error(`此股票池有 ${rows.length} 檔有效標的，組數不可超過 ${rows.length}。`);
  balancedGroups(rows, groupCount, "probability", "probabilityRank", "probabilityGroup");
  balancedGroups(rows, groupCount, "predictedReturn", "returnRank", "returnGroup");
  rows.sort((a,b) => a.probabilityRank - b.probabilityRank);
  return { ...snapshot, rows, eligibleCount: rows.length, poolSize, groupCount };
}

export function yahooQuoteUrl(stock: Pick<Stock, "ticker" | "market" | "yahooSymbol">): string | null {
  const symbol = stock.yahooSymbol ?? (stock.market === "TWSE" ? `${stock.ticker}.TW` : stock.market === "TPEX" ? `${stock.ticker}.TWO` : null);
  if (!symbol || !/^\d{4,8}\.(TW|TWO)$/.test(symbol)) return null;
  if (symbol.split(".")[0] !== stock.ticker) return null;
  return `https://tw.stock.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}
