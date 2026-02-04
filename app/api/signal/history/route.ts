import { store } from "../../../../lib/deriv/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "R_75";
  return Response.json({ symbol, history: store.getSignals(symbol) });
}
