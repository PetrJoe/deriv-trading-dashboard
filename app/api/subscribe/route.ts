import { getDerivManager } from "../../../lib/deriv/manager";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const symbol = body?.symbol as string | undefined;
  if (!symbol) {
    return Response.json({ ok: false, error: "Missing symbol" }, { status: 400 });
  }
  const manager = getDerivManager();
  manager.subscribe(symbol);
  return Response.json({ ok: true, symbol });
}
