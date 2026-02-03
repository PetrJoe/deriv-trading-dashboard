"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  CandlestickData,
  UTCTimestamp
} from "lightweight-charts";
import { StreamPayload, Candle } from "../lib/types";
import { calculateRSI, calculateSupertrend } from "../lib/deriv/indicators";

const CHART_HEIGHT = 420;
const RSI_HEIGHT = 140;

type Props = {
  symbol: string;
  streamEvent: StreamPayload | null;
  latestSignal: any;
  metrics: any;
};

export default function ChartPanel({ symbol, streamEvent, latestSignal, metrics }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rsiRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const supertrendSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const fibLinesRef = useRef<any[]>([]);
  const slLineRef = useRef<any | null>(null);
  const tp1LineRef = useRef<any | null>(null);
  const tp2LineRef = useRef<any | null>(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      height: CHART_HEIGHT,
      layout: { background: { color: "#121826" }, textColor: "#e5e7eb" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      timeScale: { timeVisible: true, secondsVisible: false }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444"
    });

    const supertrendSeries = chart.addLineSeries({
      color: "#38bdf8",
      lineWidth: 2
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    supertrendSeriesRef.current = supertrendSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!rsiRef.current || rsiChartRef.current) return;

    const rsiChart = createChart(rsiRef.current, {
      height: RSI_HEIGHT,
      layout: { background: { color: "#121826" }, textColor: "#e5e7eb" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      rightPriceScale: { borderColor: "#1f2937" },
      timeScale: { timeVisible: true, secondsVisible: false }
    });

    const rsiSeries = rsiChart.addLineSeries({ color: "#f59e0b", lineWidth: 2 });

    rsiChartRef.current = rsiChart;
    rsiSeriesRef.current = rsiSeries;

    return () => {
      rsiChart.remove();
      rsiChartRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetch(`/api/candles?symbol=${symbol}&timeframe=M5`)
      .then((res) => res.json())
      .then((data) => {
        candlesRef.current = data.candles ?? [];
        const chartData: CandlestickData<UTCTimestamp>[] = candlesRef.current.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));
        candleSeriesRef.current?.setData(chartData);
        updateSupertrend();
        updateRsi();
      })
      .catch(() => null);
  }, [symbol]);

  useEffect(() => {
    if (!streamEvent || streamEvent.type !== "candle") return;
    if (streamEvent.symbol !== symbol || streamEvent.timeframe !== "M5") return;
    const candle = streamEvent.candle as Candle;
    const list = candlesRef.current;
    const last = list[list.length - 1];
    if (last && last.time === candle.time) {
      list[list.length - 1] = candle;
    } else {
      list.push(candle);
    }
    candlesRef.current = list.slice(-500);
    candleSeriesRef.current?.update({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    });
    updateSupertrend();
    updateRsi();
  }, [streamEvent, symbol]);

  useEffect(() => {
    if (!latestSignal || !candleSeriesRef.current) return;
    if (latestSignal.action === "NEUTRAL") return;
    if (slLineRef.current) candleSeriesRef.current.removePriceLine(slLineRef.current);
    if (tp1LineRef.current) candleSeriesRef.current.removePriceLine(tp1LineRef.current);
    if (tp2LineRef.current) candleSeriesRef.current.removePriceLine(tp2LineRef.current);
    candleSeriesRef.current.setMarkers([
      {
        time: Math.floor(new Date(latestSignal.timestamp).getTime() / 1000) as UTCTimestamp,
        position: latestSignal.action === "BUY" ? "belowBar" : "aboveBar",
        color: latestSignal.action === "BUY" ? "#22c55e" : "#ef4444",
        shape: latestSignal.action === "BUY" ? "arrowUp" : "arrowDown",
        text: latestSignal.action
      }
    ]);

    if (typeof latestSignal.stopLoss === "number") {
      slLineRef.current = candleSeriesRef.current.createPriceLine({
        price: latestSignal.stopLoss,
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "SL"
      });
    }
    if (typeof latestSignal.takeProfit1 === "number") {
      tp1LineRef.current = candleSeriesRef.current.createPriceLine({
        price: latestSignal.takeProfit1,
        color: "#22c55e",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP1"
      });
    }
    if (typeof latestSignal.takeProfit2 === "number") {
      tp2LineRef.current = candleSeriesRef.current.createPriceLine({
        price: latestSignal.takeProfit2,
        color: "#16a34a",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP2"
      });
    }
  }, [latestSignal]);

  useEffect(() => {
    if (!metrics || !candleSeriesRef.current) return;
    fibLinesRef.current.forEach((line) => candleSeriesRef.current?.removePriceLine(line));
    fibLinesRef.current = [];

    if (Array.isArray(metrics.fibLevels)) {
      metrics.fibLevels.forEach((level: number) => {
        const line = candleSeriesRef.current?.createPriceLine({
          price: level,
          color: "rgba(59, 130, 246, 0.4)",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: false,
          title: "FIB"
        });
        if (line) fibLinesRef.current.push(line);
      });
    }
  }, [metrics]);

  const updateSupertrend = () => {
    if (!supertrendSeriesRef.current) return;
    const st = calculateSupertrend(candlesRef.current, 10, 2);
    if (st.length === 0) return;
    const startIndex = candlesRef.current.length - st.length;
    const data: LineData<UTCTimestamp>[] = st.map((point, index) => ({
      time: (candlesRef.current[startIndex + index]?.time ?? 0) as UTCTimestamp,
      value: point.value
    }));
    supertrendSeriesRef.current.setData(data);
  };

  const updateRsi = () => {
    if (!rsiSeriesRef.current) return;
    const rsi = calculateRSI(candlesRef.current, 14);
    if (rsi.length === 0) return;
    const startIndex = candlesRef.current.length - rsi.length;
    const data: LineData<UTCTimestamp>[] = rsi.map((value, index) => ({
      time: (candlesRef.current[startIndex + index]?.time ?? 0) as UTCTimestamp,
      value
    }));
    rsiSeriesRef.current.setData(data);
  };

  const title = useMemo(() => `M5 Chart - ${symbol}`, [symbol]);

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div>
        <h2>{title}</h2>
        <small>Supertrend overlay, RSI pane, SL/TP lines, markers.</small>
      </div>
      <div ref={containerRef} style={{ width: "100%" }} />
      <div ref={rsiRef} style={{ width: "100%" }} />
    </div>
  );
}
