import { Candle, Metrics, Signal, Timeframe } from "../types";

const MAX_CANDLES = 500;

export class InMemoryStore {
  private candles: Record<string, Record<Timeframe, Candle[]>> = {};
  private signals: Record<string, Signal[]> = {};
  private metrics: Record<string, Metrics | null> = {};

  ensureSymbol(symbol: string) {
    if (!this.candles[symbol]) {
      this.candles[symbol] = { M1: [], M5: [] };
    }
    if (!this.signals[symbol]) {
      this.signals[symbol] = [];
    }
    if (!this.metrics[symbol]) {
      this.metrics[symbol] = null;
    }
  }

  addCandle(symbol: string, timeframe: Timeframe, candle: Candle) {
    this.ensureSymbol(symbol);
    const list = this.candles[symbol][timeframe];
    const last = list[list.length - 1];
    if (last && last.time === candle.time) {
      list[list.length - 1] = candle;
    } else {
      list.push(candle);
    }
    if (list.length > MAX_CANDLES) {
      list.splice(0, list.length - MAX_CANDLES);
    }
  }

  getCandles(symbol: string, timeframe: Timeframe) {
    this.ensureSymbol(symbol);
    return this.candles[symbol][timeframe];
  }

  addSignal(signal: Signal) {
    this.ensureSymbol(signal.symbol);
    this.signals[signal.symbol].unshift(signal);
    if (this.signals[signal.symbol].length > 200) {
      this.signals[signal.symbol] = this.signals[signal.symbol].slice(0, 200);
    }
  }

  getSignals(symbol: string) {
    this.ensureSymbol(symbol);
    return this.signals[symbol];
  }

  setMetrics(symbol: string, metrics: Metrics) {
    this.ensureSymbol(symbol);
    this.metrics[symbol] = metrics;
  }

  getMetrics(symbol: string) {
    this.ensureSymbol(symbol);
    return this.metrics[symbol];
  }
}

export const store = new InMemoryStore();
