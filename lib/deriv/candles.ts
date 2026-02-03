import { Candle, Timeframe } from "../types";

export type Tick = { epoch: number; quote: number; symbol?: string };

const TF_SECONDS: Record<Timeframe, number> = {
  M1: 60,
  M5: 300
};

export class CandleBuilder {
  private lastCandle: Record<Timeframe, Candle | null> = { M1: null, M5: null };

  build(timeframe: Timeframe, tick: Tick): Candle {
    const tf = TF_SECONDS[timeframe];
    const bucket = Math.floor(tick.epoch / tf) * tf;
    const existing = this.lastCandle[timeframe];

    if (!existing || existing.time !== bucket) {
      const candle: Candle = {
        time: bucket,
        open: tick.quote,
        high: tick.quote,
        low: tick.quote,
        close: tick.quote
      };
      this.lastCandle[timeframe] = candle;
      return candle;
    }

    existing.high = Math.max(existing.high, tick.quote);
    existing.low = Math.min(existing.low, tick.quote);
    existing.close = tick.quote;
    return existing;
  }
}
