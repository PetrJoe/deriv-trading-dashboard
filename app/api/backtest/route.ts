import { Candle } from "../../../lib/types";
import { generateSignal } from "../../../lib/deriv/signalEngine";

export const runtime = "nodejs";

function parseCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift();
  if (!header) return [];
  const rows: Candle[] = [];
  for (const line of lines) {
    const [time, open, high, low, close] = line.split(",");
    rows.push({
      time: Number(time),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close)
    });
  }
  return rows;
}

export async function POST(request: Request) {
  const body = await request.json();
  const symbol = body?.symbol ?? "R_100";
  const csv = body?.csv as string | undefined;
  if (!csv) {
    return Response.json({ ok: false, error: "Missing csv" }, { status: 400 });
  }

  const candles = parseCsv(csv);
  const m5: Candle[] = [];
  const m1: Candle[] = [];
  const signals = [] as any[];

  for (const candle of candles) {
    m5.push(candle);
    m1.push(candle);
    const result = generateSignal(symbol, m5, m1);
    if (result && result.signal.action !== "NEUTRAL") {
      signals.push(result.signal);
    }
  }

  return Response.json({ ok: true, symbol, signals, total: signals.length });
}
