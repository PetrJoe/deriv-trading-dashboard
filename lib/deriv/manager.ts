import { WebSocket } from "ws";
import { EventEmitter } from "events";
import { Candle } from "../types";
import { CandleBuilder, Tick } from "./candles";
import { store } from "./store";
import { generateSignal } from "./signalEngine";

const WS_URL = "wss://ws.derivws.com/websockets/v3";
const HEARTBEAT_MS = 30_000;

class DerivManager {
  private ws: WebSocket | null = null;
  private appId: string;
  private symbols = new Set<string>();
  private candleBuilders: Record<string, CandleBuilder> = {};
  private emitter = new EventEmitter();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private signalTimer: NodeJS.Timeout | null = null;

  constructor(appId: string) {
    this.appId = appId;
    this.connect();
    this.startSignalEngine();
  }

  on(event: "candle" | "signal" | "metrics" | "heartbeat", listener: (payload: any) => void) {
    this.emitter.on(event, listener);
  }

  subscribe(symbol: string) {
    this.symbols.add(symbol);
    if (!this.candleBuilders[symbol]) {
      this.candleBuilders[symbol] = new CandleBuilder();
    }
    store.ensureSymbol(symbol);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({ ticks: symbol, subscribe: 1 })
      );
    }
  }

  getEmitter() {
    return this.emitter;
  }

  private connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    const url = `${WS_URL}?app_id=${this.appId || "1089"}`;
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      this.symbols.forEach((symbol) => {
        this.ws?.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
      });
    });

    this.ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.tick) {
          this.handleTick(data.tick);
        }
      } catch (error) {
        console.error("Deriv WS parse error", error);
      }
    });

    this.ws.on("close", () => {
      this.scheduleReconnect();
    });

    this.ws.on("error", () => {
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2_000);
  }

  private handleTick(tick: Tick) {
    const symbol = tick.symbol;
    if (!symbol) return;
    if (!this.candleBuilders[symbol]) {
      this.candleBuilders[symbol] = new CandleBuilder();
    }

    const m1 = this.candleBuilders[symbol].build("M1", tick);
    const m5 = this.candleBuilders[symbol].build("M5", tick);

    this.pushCandle(symbol, "M1", m1);
    this.pushCandle(symbol, "M5", m5);
  }

  private pushCandle(symbol: string, timeframe: "M1" | "M5", candle: Candle) {
    store.addCandle(symbol, timeframe, candle);
    this.emitter.emit("candle", { symbol, timeframe, candle });
  }

  private startSignalEngine() {
    if (this.signalTimer) return;
    this.signalTimer = setInterval(() => {
      this.symbols.forEach((symbol) => {
        const m5 = store.getCandles(symbol, "M5");
        const m1 = store.getCandles(symbol, "M1");
        const result = generateSignal(symbol, m5, m1);
        if (!result) return;
        store.addSignal(result.signal);
        store.setMetrics(symbol, result.metrics);
        this.emitter.emit("signal", { symbol, signal: result.signal });
        this.emitter.emit("metrics", { symbol, metrics: result.metrics });
      });
      this.emitter.emit("heartbeat", { ts: Date.now() });
    }, HEARTBEAT_MS);
  }
}

let manager: DerivManager | null = null;

export function getDerivManager() {
  if (!manager) {
    manager = new DerivManager("1089");
  }
  return manager;
}
