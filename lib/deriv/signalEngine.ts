import { Candle, Metrics, Signal } from "../types";
import { buildFibLevels, nearestFibLevel } from "./fibonacci";
import { calculateATR, calculateRSI, calculateSupertrend } from "./indicators";

export function generateSignal(symbol: string, m5: Candle[], m1: Candle[]): { signal: Signal; metrics: Metrics } | null {
  if (m5.length < 60 || m1.length < 5) return null;

  const supertrend = calculateSupertrend(m5, 10, 2);
  if (supertrend.length === 0) return null;
  const stLatest = supertrend[supertrend.length - 1];

  const rsi = calculateRSI(m5, 14);
  const atr = calculateATR(m5, 14);
  if (rsi.length < 3 || atr.length === 0) return null;

  const rsiNow = rsi[rsi.length - 1];
  const rsiPrev = rsi[rsi.length - 2];

  const trend = stLatest.direction;
  const fib = buildFibLevels(m5, trend);
  const lastClose = m5[m5.length - 1].close;
  const nearest = nearestFibLevel(lastClose, fib);

  const momentumBuy = rsiPrev < 30 && rsiNow > rsiPrev;
  const momentumSell = rsiPrev > 70 && rsiNow < rsiPrev;

  const fibPriority = nearest && ["38.2", "50.0", "61.8"].includes(nearest.key);
  const confidence: "HIGH" | "MEDIUM" | "LOW" = fibPriority ? "HIGH" : "MEDIUM";

  let action: Signal["action"] = "NEUTRAL";
  if (trend === "bullish" && momentumBuy) action = "POTENTIAL_BUY";
  if (trend === "bearish" && momentumSell) action = "POTENTIAL_SELL";

  const m1Last = m1[m1.length - 1];
  if (action === "POTENTIAL_BUY") {
    const bullish = m1Last.close >= m1Last.open;
    const supportZone = nearest ? nearest.price : stLatest.value;
    if (bullish && m1Last.close >= supportZone) {
      action = "BUY";
    }
  }
  if (action === "POTENTIAL_SELL") {
    const bearish = m1Last.close <= m1Last.open;
    const resistanceZone = nearest ? nearest.price : stLatest.value;
    if (bearish && m1Last.close <= resistanceZone) {
      action = "SELL";
    }
  }

  const atrValue = atr[atr.length - 1];
  const entryPrice = action === "BUY" || action === "SELL" ? m1Last.close : null;

  let stopLoss: number | null = null;
  let takeProfit1: number | null = null;
  let takeProfit2: number | null = null;

  if (entryPrice !== null) {
    const risk = atrValue * 1.5;
    stopLoss = action === "BUY" ? entryPrice - risk : entryPrice + risk;

    const target1 = atrValue * 1.0;
    const target2 = atrValue * 1.5;

    const fibTp1 = fib?.extensions["127.2"];
    const fibTp2 = fib?.extensions["161.8"];

    const rawTp1 = action === "BUY" ? entryPrice + target1 : entryPrice - target1;
    const rawTp2 = action === "BUY" ? entryPrice + target2 : entryPrice - target2;

    takeProfit1 = fibTp1
      ? action === "BUY"
        ? Math.min(rawTp1, fibTp1)
        : Math.max(rawTp1, fibTp1)
      : rawTp1;

    takeProfit2 = fibTp2
      ? action === "BUY"
        ? Math.min(rawTp2, fibTp2)
        : Math.max(rawTp2, fibTp2)
      : rawTp2;
  }

  const signal: Signal = {
    timestamp: new Date(m5[m5.length - 1].time * 1000).toISOString(),
    symbol,
    action,
    confidence: action === "NEUTRAL" ? "LOW" : confidence,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    details: {
      supertrend: trend,
      rsiValue: rsiNow,
      fibLevel: nearest ? `${nearest.key}%` : null,
      atrValue
    }
  };

  const metrics: Metrics = {
    supertrend: trend,
    rsi: rsiNow,
    atr: atrValue,
    fibLevels: fib
      ? Object.values({ ...fib.retracements, ...fib.extensions }).map((v) => Number(v))
      : []
  };

  return { signal, metrics };
}
