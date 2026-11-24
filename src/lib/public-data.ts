import { z } from "zod";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value =>
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
const finite = z.number().finite();
export const stockSchema = z.object({
  ticker: z.string().regex(/^\d{4,8}$/), name: z.string().min(1).max(100),
  market: z.enum(["TWSE", "TPEX", "OTHER"]),
  yahooSymbol: z.string().regex(/^\d{4,8}\.(TW|TWO)$/).nullable().optional(),
  probability: finite.min(0).max(1), predictedReturn: finite,
  probabilityRank: z.number().int().positive(), returnRank: z.number().int().positive(),
  probabilityGroup: z.number().int().positive(), returnGroup: z.number().int().positive(),
  marketCapMillion: finite.positive().nullable(), marketCapRank: z.number().int().positive().nullable(),
  previousWeekReturn: finite.min(-1).nullable().optional(),
  previousWeekStart: date.nullable().optional(), previousWeekEnd: date.nullable().optional(),
}).strict();
export const snapshotSchema = z.object({
  signalDate: date, targetWeekStart: date, targetWeekEnd: date,
  generatedAt: z.string().datetime({ offset: true }), sourceUpdatedAt: z.string().datetime({ offset: true }).nullable(),
  poolSize: z.number().int().positive().nullable(), groupCount: z.number().int().positive(),
  eligibleCount: z.number().int().positive().max(10000), modelPeriod: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  marketCapMethods: z.record(z.number().int().nonnegative()), rows: z.array(stockSchema).min(1).max(10000),
  universeRows: z.array(stockSchema).min(1).max(10000).optional(),
  universeCount: z.number().int().positive().max(10000).optional(),
  universeGeneratedAt: z.string().datetime({ offset: true }).optional(),
  poolMode: z.literal("fixed").optional(), marketCapBasisDate: date.optional(),
}).strict().superRefine((value, ctx) => {
  for (const row of [...value.rows, ...(value.universeRows ?? [])]) {
    const start = row.previousWeekStart, end = row.previousWeekEnd;
    if ((row.previousWeekReturn != null && (!start || !end)) || (!!start !== !!end)
      || (start && end && (start >= end || end > value.signalDate)))
      ctx.addIssue({ code: "custom", message: "Historical weekly returns require a completed interval ending by the signal date" });
  }
  if (value.poolMode === "fixed" && (!value.marketCapBasisDate || value.marketCapBasisDate >= value.signalDate
      || !value.universeCount || value.universeCount > 1000 || value.poolSize === null || value.poolSize > 1000))
    ctx.addIssue({ code: "custom", message: "Invalid fixed-pool basis or maximum size" });
  if (value.marketCapBasisDate && value.poolMode !== "fixed")
    ctx.addIssue({ code: "custom", message: "Market-cap basis requires a fixed pool" });
  if (value.rows.length !== value.eligibleCount || new Set(value.rows.map(row => row.ticker)).size !== value.rows.length)
    ctx.addIssue({ code: "custom", message: "Row counts or stock identifiers are inconsistent" });
  if (value.rows.some(row => row.probabilityGroup > value.groupCount || row.returnGroup > value.groupCount))
    ctx.addIssue({ code: "custom", message: "Invalid model grouping" });
  if (value.targetWeekStart <= value.signalDate || value.targetWeekEnd < value.targetWeekStart)
    ctx.addIssue({ code: "custom", message: "Invalid observation week" });
  if (value.poolSize !== null && value.rows.some(row => row.marketCapRank === null || row.marketCapRank > value.poolSize!))
    ctx.addIssue({ code: "custom", message: "Model stocks must belong to the market-cap pool" });
  if (value.universeRows) {
    const rows = value.universeRows;
    if (!value.universeCount || rows.length > value.universeCount || new Set(rows.map(row => row.ticker)).size !== rows.length
      || rows.some(row => row.marketCapRank === null || row.marketCapRank > value.universeCount!))
      ctx.addIssue({ code: "custom", message: "Invalid complete-universe scores or cap ranks" });
    if (new Set(rows.map(row => row.marketCapRank)).size !== rows.length)
      ctx.addIssue({ code: "custom", message: "Duplicate complete-universe cap ranks" });
    const universe = new Map(rows.map(row => [row.ticker, row]));
    if (value.rows.some(row => { const full = universe.get(row.ticker); return !full || full.probability !== row.probability || full.predictedReturn !== row.predictedReturn
      || full.previousWeekReturn !== row.previousWeekReturn || full.previousWeekStart !== row.previousWeekStart || full.previousWeekEnd !== row.previousWeekEnd; }))
      ctx.addIssue({ code: "custom", message: "Published pool and universe scores must match" });
  }
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Stock = z.infer<typeof stockSchema>;
export type RunSummary = { id: string; signalDate: string; publishedAt: string; poolSize: number; groupCount: number; modelPeriod: string; marketCapBasisDate?: string | null; file: string };
