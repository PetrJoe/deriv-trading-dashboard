import { Candle } from "../types";

export function calculateATR(candles: Candle[], period: number): number[] {
  if (candles.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trs.push(tr);
  }

  const atrs: number[] = [];
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atrs.push(atr);
  for (let i = period; i < trs.length; i += 1) {
    atr = (atr * (period - 1) + trs[i]) / period;
    atrs.push(atr);
  }
  return atrs;
}

export function calculateRSI(candles: Candle[], period: number): number[] {
  if (candles.length < period + 1) return [];
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const rsi: number[] = [];
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + rs));

  for (let i = period; i < gains.length; i += 1) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const nextRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + nextRs));
  }
  return rsi;
}

export type SupertrendPoint = {
  value: number;
  direction: "bullish" | "bearish";
};

export function calculateSupertrend(
  candles: Candle[],
  period: number,
  multiplier: number
): SupertrendPoint[] {
  const atrs = calculateATR(candles, period);
  if (atrs.length === 0) return [];

  const result: SupertrendPoint[] = [];
  let upperBand = 0;
  let lowerBand = 0;
  let direction: "bullish" | "bearish" = "bullish";

  const startIndex = period;
  for (let i = startIndex; i < candles.length; i += 1) {
    const candle = candles[i];
    const atr = atrs[i - period];
    const basicUpper = (candle.high + candle.low) / 2 + multiplier * atr;
    const basicLower = (candle.high + candle.low) / 2 - multiplier * atr;

    if (i === startIndex) {
      upperBand = basicUpper;
      lowerBand = basicLower;
      direction = candle.close >= basicUpper ? "bullish" : "bearish";
    } else {
      upperBand = basicUpper < upperBand || candle.close > upperBand ? basicUpper : upperBand;
      lowerBand = basicLower > lowerBand || candle.close < lowerBand ? basicLower : lowerBand;

      if (direction === "bullish" && candle.close < lowerBand) {
        direction = "bearish";
      } else if (direction === "bearish" && candle.close > upperBand) {
        direction = "bullish";
      }
    }

    const value = direction === "bullish" ? lowerBand : upperBand;
    result.push({ value, direction });
  }

  return result;
}
