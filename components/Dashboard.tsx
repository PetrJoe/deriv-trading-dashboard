"use client";

import { useEffect, useMemo, useState } from "react";
import ChartPanel from "./ChartPanel";
import MetricsPanel from "./MetricsPanel";
import PairSelector from "./PairSelector";
import SignalLog from "./SignalLog";
import { StreamPayload } from "../lib/types";

export default function Dashboard() {
  const [symbol, setSymbol] = useState("R_75");
  const [streamEvent, setStreamEvent] = useState<StreamPayload | null>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol })
    }).catch(() => null);
  }, [symbol]);

  useEffect(() => {
    const source = new EventSource(`/api/stream?symbol=${symbol}`);

    source.addEventListener("signal", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setSignals((prev) => [data.signal, ...prev].slice(0, 200));
      if (data.signal?.confidence === "HIGH" && data.signal?.action !== "NEUTRAL") {
        setAlert(`${data.signal.action} ${symbol} (${data.signal.confidence})`);
        setTimeout(() => setAlert(null), 4000);
      }
      setStreamEvent({ type: "signal", symbol, signal: data.signal });
    });

    source.addEventListener("metrics", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setMetrics(data.metrics);
      setStreamEvent({ type: "metrics", symbol, metrics: data.metrics });
    });

    source.addEventListener("candle", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setStreamEvent({ type: "candle", symbol, timeframe: data.timeframe, candle: data.candle });
    });

    return () => source.close();
  }, [symbol]);

  const latestSignal = useMemo(() => signals[0], [signals]);

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Deriv Volatility Signals</h1>
          <small>Multi-timeframe Supertrend + RSI + Fibonacci strategy.</small>
        </div>
        <div className="row">
          {alert && <span className="badge warn">{alert}</span>}
          <PairSelector value={symbol} onChange={setSymbol} />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <ChartPanel symbol={symbol} streamEvent={streamEvent} latestSignal={latestSignal} metrics={metrics} />
        </div>
        <div className="grid" style={{ gap: 16 }}>
          <MetricsPanel metrics={metrics} latestSignal={latestSignal} />
          <SignalLog signals={signals} />
        </div>
      </div>
    </div>
  );
}
