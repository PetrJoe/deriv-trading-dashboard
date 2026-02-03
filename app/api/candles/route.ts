import { store } from "../../../lib/deriv/store";
import { Timeframe } from "../../../lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "R_100";
  const timeframe = (searchParams.get("timeframe") ?? "M5") as Timeframe;
  const candles = store.getCandles(symbol, timeframe);
  return Response.json({ symbol, timeframe, candles });
}
