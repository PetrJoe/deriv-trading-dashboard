export type Timeframe = "M1" | "M5";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type SignalAction = "BUY" | "SELL" | "POTENTIAL_BUY" | "POTENTIAL_SELL" | "NEUTRAL";

export type Signal = {
  timestamp: string;
  symbol: string;
  action: SignalAction;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  details: {
    supertrend: "bullish" | "bearish" | "neutral";
    rsiValue: number | null;
    fibLevel: string | null;
    atrValue: number | null;
  };
};

export type Metrics = {
  supertrend: "bullish" | "bearish" | "neutral";
  rsi: number | null;
  atr: number | null;
  fibLevels: number[];
};

export type StreamPayload = {
  type: "candle" | "signal" | "metrics" | "heartbeat";
  symbol: string;
  timeframe?: Timeframe;
  candle?: Candle;
  signal?: Signal;
  metrics?: Metrics;
};
