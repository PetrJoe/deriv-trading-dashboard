import { WebSocket } from "ws";
import { Candle, Timeframe } from "../types";

const WS_URL = "wss://ws.derivws.com/websockets/v3";
const APP_ID = "1089";
const HISTORY_TIMEOUT_MS = 5000;
const historyCache = new Map<string, Promise<Candle[]>>();

const granularityMap: Record<Timeframe, number> = {
  M1: 60,
  M5: 300
};

type DerivCandle = {
  epoch: number;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
};

export function fetchHistoricalCandles(
  symbol: string,
  timeframe: Timeframe,
  count = 500
): Promise<Candle[]> {
  const key = `${symbol}-${timeframe}-${count}`;
  const cached = historyCache.get(key);
  if (cached) return cached;

  const promise = new Promise<Candle[]>((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?app_id=${APP_ID}`);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      ws.close();
      reject(new Error("Deriv history request timed out"));
    }, HISTORY_TIMEOUT_MS);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count,
          end: "latest",
          granularity: granularityMap[timeframe],
          style: "candles"
        })
      );
    });

    ws.on("message", (raw) => {
      if (settled) return;
      try {
        const data = JSON.parse(raw.toString());
        if (data.error) {
          settled = true;
          clearTimeout(timer);
          ws.close();
          reject(new Error(data.error.message ?? "Deriv history error"));
          return;
        }
        if (Array.isArray(data.candles)) {
          settled = true;
          clearTimeout(timer);
          ws.close();
          resolve(
            (data.candles as DerivCandle[]).map((candle) => ({
              time: candle.epoch,
              open: Number(candle.open),
              high: Number(candle.high),
              low: Number(candle.low),
              close: Number(candle.close)
            }))
          );
        }
      } catch (error) {
        settled = true;
        clearTimeout(timer);
        ws.close();
        reject(error);
      }
    });

    ws.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ws.close();
      reject(error);
    });
  });

  historyCache.set(key, promise);
  promise.finally(() => historyCache.delete(key));
  return promise;
}
