import { getDerivManager } from "../../../lib/deriv/manager";
import { store } from "../../../lib/deriv/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "R_100";

  const manager = getDerivManager();
  manager.subscribe(symbol);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, payload: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const onCandle = (payload: any) => {
        if (payload.symbol === symbol) send("candle", payload);
      };
      const onSignal = (payload: any) => {
        if (payload.symbol === symbol) send("signal", payload);
      };
      const onMetrics = (payload: any) => {
        if (payload.symbol === symbol) send("metrics", payload);
      };
      const onHeartbeat = (payload: any) => send("heartbeat", payload);

      manager.on("candle", onCandle);
      manager.on("signal", onSignal);
      manager.on("metrics", onMetrics);
      manager.on("heartbeat", onHeartbeat);

      const latestSignal = store.getSignals(symbol)[0];
      const latestMetrics = store.getMetrics(symbol);
      if (latestSignal) send("signal", { symbol, signal: latestSignal });
      if (latestMetrics) send("metrics", { symbol, metrics: latestMetrics });

      request.signal.addEventListener("abort", () => {
        manager.getEmitter().removeListener("candle", onCandle);
        manager.getEmitter().removeListener("signal", onSignal);
        manager.getEmitter().removeListener("metrics", onMetrics);
        manager.getEmitter().removeListener("heartbeat", onHeartbeat);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
