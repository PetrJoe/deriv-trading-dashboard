import { Candle } from "../types";

export type FibLevels = {
  low: number;
  high: number;
  retracements: Record<string, number>;
  extensions: Record<string, number>;
};

const RETRACEMENTS = [0.236, 0.382, 0.5, 0.618, 0.786];
const EXTENSIONS = [1.272, 1.618];

function findSwings(candles: Candle[], lookback = 60) {
  const start = Math.max(0, candles.length - lookback);
  const swings: { type: "high" | "low"; index: number; price: number }[] = [];
  for (let i = start + 2; i < candles.length - 2; i += 1) {
    const prev2 = candles[i - 2];
    const prev1 = candles[i - 1];
    const curr = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    if (curr.high > prev1.high && curr.high > prev2.high && curr.high > next1.high && curr.high > next2.high) {
      swings.push({ type: "high", index: i, price: curr.high });
    }
    if (curr.low < prev1.low && curr.low < prev2.low && curr.low < next1.low && curr.low < next2.low) {
      swings.push({ type: "low", index: i, price: curr.low });
    }
  }
  return swings;
}

export function buildFibLevels(candles: Candle[], trend: "bullish" | "bearish") {
  const swings = findSwings(candles);
  if (swings.length < 2) return null;

  let low: { type: "low" | "high"; index: number; price: number } | undefined;
  let high: { type: "low" | "high"; index: number; price: number } | undefined;

  for (let i = swings.length - 1; i >= 0; i -= 1) {
    if (!low && swings[i].type === "low") low = swings[i];
    if (!high && swings[i].type === "high") high = swings[i];
    if (low && high) break;
  }

  if (!low || !high) return null;

  if (trend === "bullish" && low.index > high.index) {
    for (let i = swings.length - 1; i >= 0; i -= 1) {
      if (swings[i].type === "low" && swings[i].index < high.index) {
        low = swings[i];
        break;
      }
    }
  }

  if (trend === "bearish" && high.index > low.index) {
    for (let i = swings.length - 1; i >= 0; i -= 1) {
      if (swings[i].type === "high" && swings[i].index < low.index) {
        high = swings[i];
        break;
      }
    }
  }

  const start = trend === "bullish" ? low.price : high.price;
  const end = trend === "bullish" ? high.price : low.price;
  const range = end - start;

  const retracements: Record<string, number> = {};
  RETRACEMENTS.forEach((level) => {
    const price = trend === "bullish" ? end - range * level : end + range * level;
    retracements[(level * 100).toFixed(1)] = price;
  });

  const extensions: Record<string, number> = {};
  EXTENSIONS.forEach((level) => {
    const price = trend === "bullish" ? end + range * (level - 1) : end - range * (level - 1);
    extensions[(level * 100).toFixed(1)] = price;
  });

  return {
    low: low.price,
    high: high.price,
    retracements,
    extensions
  } as FibLevels;
}

export function nearestFibLevel(price: number, fib: FibLevels | null) {
  if (!fib) return null;
  let closest: { key: string; diff: number; price: number } | null = null;
  for (const [key, value] of Object.entries(fib.retracements)) {
    const diff = Math.abs(price - value);
    if (!closest || diff < closest.diff) {
      closest = { key, diff, price: value };
    }
  }
  return closest;
}
