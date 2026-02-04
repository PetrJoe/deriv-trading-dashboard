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

export type Fractal = {
  time: number;
  price: number;
  type: "up" | "down";
};

export function calculateFractals(candles: Candle[], period: number = 2): Fractal[] {
  const fractals: Fractal[] = [];
  if (candles.length < period * 2 + 1) return fractals;

  for (let i = period; i < candles.length - period; i++) {
    const curr = candles[i];

    // Up Fractal
    let isUp = true;
    for (let j = 1; j <= period; j++) {
      if (candles[i - j].high > curr.high || candles[i + j].high > curr.high) {
        isUp = false;
        break;
      }
    }

    // Down Fractal
    let isDown = true;
    for (let j = 1; j <= period; j++) {
      if (candles[i - j].low < curr.low || candles[i + j].low < curr.low) {
        isDown = false;
        break;
      }
    }

    if (isUp) {
      fractals.push({ time: curr.time, price: curr.high, type: "up" });
    }
    if (isDown) {
      fractals.push({ time: curr.time, price: curr.low, type: "down" });
    }
  }
  return fractals;
}

export type FibonacciLevel = {
  level: number;
  price: number;
  color: string;
};

export type FibonacciRetracement = {
  startPrice: number;
  endPrice: number;
  startTime: number;
  endTime: number;
  trend: "up" | "down";
  levels: FibonacciLevel[];
};

export function calculateFibonacciLevels(candles: Candle[]): FibonacciRetracement | null {
  // 1. Get all raw fractals
  const fractals = calculateFractals(candles, 5); 
  if (fractals.length < 2) return null;

  // 2. Filter to get alternating significant Highs and Lows (ZigZag-like)
  const cleanFractals: Fractal[] = [];
  
  // Add first fractal
  cleanFractals.push(fractals[0]);

  for (let i = 1; i < fractals.length; i++) {
    const last = cleanFractals[cleanFractals.length - 1];
    const curr = fractals[i];

    if (last.type === curr.type) {
      // If same type, keep the more extreme one
      if (last.type === "up") {
        if (curr.price > last.price) {
          cleanFractals[cleanFractals.length - 1] = curr;
        }
      } else {
        if (curr.price < last.price) {
          cleanFractals[cleanFractals.length - 1] = curr;
        }
      }
    } else {
      // If different type, add it
      cleanFractals.push(curr);
    }
  }

  // Need at least 2 points
  if (cleanFractals.length < 2) return null;

  // 3. Select the LAST two points
  const endFractal = cleanFractals[cleanFractals.length - 1];
  const startFractal = cleanFractals[cleanFractals.length - 2];

  const trend = startFractal.type === "down" && endFractal.type === "up" ? "up" : "down";
  const diff = Math.abs(endFractal.price - startFractal.price);

  // User Rules:
  // Uptrend: Anchor Low -> High. 0 = High, 1 = Low.
  // Downtrend: Anchor High -> Low. 0 = Low, 1 = High.
  
  // Levels:
  // 0.236: Shallow
  // 0.382: Moderate
  // 0.5: Psychological Midpoint
  // 0.618: Golden Ratio (Key Buy/Sell Zone)
  // 0.786: Deep Retracement (Last Defense)
  // 1.0: Invalidation
  // 1.272, 1.618: Extensions (TP)

  const rawLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const extensionLevels = [-0.272, -0.618]; // Negative because they go BEYOND the start (0) in our calculation logic

  const levels: FibonacciLevel[] = [];

  // 1. Standard Levels
  rawLevels.forEach(level => {
    let price = 0;
    let color = "#787b86"; // Default gray
    
    if (level === 0.5) color = "#fbbf24"; // Yellow (Psychological)
    if (level === 0.618) color = "#facc15"; // Gold (Golden Ratio)
    if (level === 0.786) color = "#f87171"; // Red (Deep/Stop Zone)
    if (level === 1) color = "#ef4444"; // Red (Invalidation)
    
    if (trend === "up") {
      // Uptrend (Low -> High)
      // Retracing DOWN from High (0). 100% retracement = Low (Start Price).
      // Price = High - (Diff * Level)
      price = endFractal.price - (diff * level);
    } else {
      // Downtrend (High -> Low)
      // Retracing UP from Low (0). 100% retracement = High (Start Price).
      // Price = Low + (Diff * Level)
      price = endFractal.price + (diff * level);
    }
    levels.push({ level, price, color });
  });

  // 2. Extensions (TP)
  extensionLevels.forEach(level => {
    let price = 0;
    // Extensions go beyond the High in Uptrend, or below Low in Downtrend.
    // Our formula above: Price = End - (Diff * Level)
    // If Level is negative (e.g. -0.618): Price = End + (Diff * 0.618) -> Higher than High (TP for Long)
    
    if (trend === "up") {
      price = endFractal.price - (diff * level);
    } else {
      price = endFractal.price + (diff * level);
    }
    levels.push({ level: Math.abs(level) + 1, price, color: "#22c55e" }); // Green for TP (1.272, 1.618)
  });

  return {
    startPrice: startFractal.price,
    endPrice: endFractal.price,
    startTime: startFractal.time,
    endTime: endFractal.time,
    trend,
    levels
  };
}
