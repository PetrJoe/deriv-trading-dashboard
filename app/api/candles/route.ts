import { store } from "../../../lib/deriv/store";
import { fetchHistoricalCandles } from "../../../lib/deriv/history";
import { Timeframe } from "../../../lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "R_100";
  const timeframe = (searchParams.get("timeframe") ?? "M5") as Timeframe;
  let candles = store.getCandles(symbol, timeframe);

  if (candles.length < 2) {
    try {
      const historical = await fetchHistoricalCandles(symbol, timeframe);
      if (historical.length > 0) {
        store.setCandles(symbol, timeframe, historical);
        candles = store.getCandles(symbol, timeframe);
      }
    } catch (error) {
      console.error("Failed to load historical candles", error);
    }
  }
  return Response.json({ symbol, timeframe, candles });
}
