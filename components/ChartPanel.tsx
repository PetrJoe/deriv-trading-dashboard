"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  CandlestickData,
  UTCTimestamp,
  SeriesMarker
} from "lightweight-charts";
import { StreamPayload, Candle } from "../lib/types";
import { 
  calculateRSI, 
  calculateFractals, 
  calculateFibonacciLevels, 
  FibonacciRetracement 
} from "../lib/deriv/indicators";

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
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const fibSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);
  const slLineRef = useRef<any | null>(null);
  const tp1LineRef = useRef<any | null>(null);
  const tp2LineRef = useRef<any | null>(null);
  const signalMarkersRef = useRef<SeriesMarker<UTCTimestamp>[]>([]);
  const fractalMarkersRef = useRef<SeriesMarker<UTCTimestamp>[]>([]);

  const updateMarkers = () => {
    if (!candleSeriesRef.current) return;
    const markers = [...signalMarkersRef.current, ...fractalMarkersRef.current];
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    candleSeriesRef.current.setMarkers(markers);
  };

  useEffect(() => {
    if (!containerRef.current || !rsiRef.current) return;

    // 1. Create Main Chart
    const chart = createChart(containerRef.current, {
      height: CHART_HEIGHT,
      layout: { background: { color: "#121826" }, textColor: "#e5e7eb" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 50 }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444"
    });

    // 2. Create RSI Chart
    const rsiChart = createChart(rsiRef.current, {
      height: RSI_HEIGHT,
      layout: { background: { color: "#121826" }, textColor: "#e5e7eb" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      rightPriceScale: { borderColor: "#1f2937" },
      timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 50 }
    });

    const rsiSeries = rsiChart.addLineSeries({ color: "#f59e0b", lineWidth: 2 });

    // 3. Synchronize TimeScales
    const mainTimeScale = chart.timeScale();
    const rsiTimeScale = rsiChart.timeScale();

    mainTimeScale.subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        rsiTimeScale.setVisibleLogicalRange(range);
      }
    });

    rsiTimeScale.subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        mainTimeScale.setVisibleLogicalRange(range);
      }
    });

    // 4. Assign Refs
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    rsiChartRef.current = rsiChart;
    rsiSeriesRef.current = rsiSeries;

    return () => {
      chart.remove();
      rsiChart.remove();
      chartRef.current = null;
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
        chartRef.current?.timeScale().scrollToRealTime();
        updateFractals();
        updateFibonacci();
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
    updateFractals();
    updateFibonacci();
    updateRsi();
  }, [streamEvent, symbol]);

  useEffect(() => {
    if (!latestSignal || !candleSeriesRef.current) return;
    if (latestSignal.action === "NEUTRAL") return;
    if (slLineRef.current) candleSeriesRef.current.removePriceLine(slLineRef.current);
    if (tp1LineRef.current) candleSeriesRef.current.removePriceLine(tp1LineRef.current);
    if (tp2LineRef.current) candleSeriesRef.current.removePriceLine(tp2LineRef.current);
    
    signalMarkersRef.current = [
      {
        time: Math.floor(new Date(latestSignal.timestamp).getTime() / 1000) as UTCTimestamp,
        position: latestSignal.action === "BUY" ? "belowBar" : "aboveBar",
        color: latestSignal.action === "BUY" ? "#22c55e" : "#ef4444",
        shape: latestSignal.action === "BUY" ? "arrowUp" : "arrowDown",
        text: latestSignal.action
      }
    ];
    updateMarkers();

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
    // Removed old fibLines logic
  }, [metrics]);

  const [fibSignal, setFibSignal] = useState<{
    action: string;
    tp: number[];
    sl: number;
    trend: string;
  } | null>(null);

  const updateFibonacci = () => {
    if (!chartRef.current || candlesRef.current.length < 50) return;

    const fib = calculateFibonacciLevels(candlesRef.current);

    // Clear old series
    fibSeriesRefs.current.forEach((s) => chartRef.current?.removeSeries(s));
    fibSeriesRefs.current = [];

    if (!fib) {
      setFibSignal(null);
      return;
    }

    const lastCandle = candlesRef.current[candlesRef.current.length - 1];

    // Draw new lines as Series
    fib.levels.forEach((l) => {
      // Determine label text
      let labelText = "";
      if (l.level === 0.618) labelText = fib.trend === "up" ? "BUY (Golden)" : "SELL (Golden)";
      else if (l.level === 0.5) labelText = "50% Mid";
      else if (l.level > 1) labelText = `TP (${l.level})`;
      else if (l.level === 0.786) labelText = "SL Watch";
      else if (l.level === 1) labelText = "INVALIDATION";
      
      const series = chartRef.current?.addLineSeries({
        color: l.color,
        lineWidth: 2, // Tick/Thick
        lineStyle: 0, // Solid
        crosshairMarkerVisible: false,
        lastValueVisible: true, // Enable label on axis
        priceLineVisible: false,
        title: labelText // Legend title
      });
      
      if (series) {
        series.setData([
          { time: fib.startTime as UTCTimestamp, value: l.price },
          { time: lastCandle.time as UTCTimestamp, value: l.price }
        ]);
        
        // Add Marker Label "in front of" the line (at the end)
        if (labelText) {
             let markerShape: "arrowUp" | "arrowDown" | "circle" = "circle";
             if (l.level === 0.618) markerShape = fib.trend === "up" ? "arrowUp" : "arrowDown";
             
             series.setMarkers([
                 {
                     time: lastCandle.time as UTCTimestamp,
                     position: "inBar",
                     shape: markerShape,
                     color: l.color,
                     text: labelText,
                     size: 1
                 }
             ]);
        }
        
        fibSeriesRefs.current.push(series);
      }
    });

    // Generate Signal
    const currentPrice = candlesRef.current[candlesRef.current.length - 1].close;
    let action = "WAIT";

    const level05 = fib.levels.find((l) => l.level === 0.5)?.price || 0;
    const level618 = fib.levels.find((l) => l.level === 0.618)?.price || 0;
    const level786 = fib.levels.find((l) => l.level === 0.786)?.price || 0;
    const level1 = fib.levels.find((l) => l.level === 1)?.price || 0;
    const levelTP1 = fib.levels.find((l) => l.level > 1.2 && l.level < 1.3)?.price || 0; // ~1.272
    const levelTP2 = fib.levels.find((l) => l.level > 1.6)?.price || 0; // ~1.618

    let slPrice = 0;

    if (fib.trend === "up") {
      // Uptrend
      if (currentPrice <= level05 && currentPrice >= level618) {
        action = "BUY ZONE (0.5 - 0.618)";
        slPrice = level786; // SL below 0.786
      } else if (currentPrice < level618 && currentPrice > level786) {
        action = "DEEP BUY (High Risk)";
        slPrice = level1; // SL below 1.0
      } else if (currentPrice < level1) {
        action = "INVALIDATED (Trend Broken)";
      } else if (currentPrice > level05) {
        action = "WAIT FOR PULLBACK";
      }
    } else {
      // Downtrend
      if (currentPrice >= level05 && currentPrice <= level618) {
        action = "SELL ZONE (0.5 - 0.618)";
        slPrice = level786; // SL above 0.786
      } else if (currentPrice > level618 && currentPrice < level786) {
        action = "DEEP SELL (High Risk)";
        slPrice = level1; // SL above 1.0
      } else if (currentPrice > level1) {
        action = "INVALIDATED (Trend Broken)";
      } else if (currentPrice < level05) {
        action = "WAIT FOR PULLBACK";
      }
    }

    setFibSignal({
      action,
      trend: fib.trend.toUpperCase(),
      sl: slPrice,
      tp: [levelTP1, levelTP2].filter(p => p > 0)
    });
  };

  const updateFractals = () => {
    const fractals = calculateFractals(candlesRef.current, 2);
    fractalMarkersRef.current = fractals.map((f) => ({
      time: f.time as UTCTimestamp,
      position: f.type === "up" ? "aboveBar" : "belowBar",
      color: f.type === "up" ? "#10b981" : "#f43f5e",
      shape: "circle",
      size: 0.5
    }));
    updateMarkers();
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
        <small>Fractals (Swing Points), RSI pane, SL/TP lines, markers.</small>
        {fibSignal && (
          <div style={{ marginTop: 8, padding: 8, background: "#1f2937", borderRadius: 4, fontSize: "0.9em" }}>
            <strong>Fib Setup:</strong> {fibSignal.trend} TREND | 
            <span style={{ marginLeft: 8, color: fibSignal.action.includes("BUY") ? "#4caf50" : fibSignal.action.includes("SELL") ? "#f44336" : "#fbbf24" }}>
              {fibSignal.action}
            </span>
            <div style={{ marginTop: 4, fontSize: "0.8em", color: "#9ca3af" }}>
              SL: {fibSignal.sl.toFixed(5)} | TP: {fibSignal.tp.map(t => t.toFixed(5)).join(", ")}
            </div>
          </div>
        )}
      </div>
      <div ref={containerRef} style={{ width: "100%" }} />
      <div ref={rsiRef} style={{ width: "100%" }} />
    </div>
  );
}
