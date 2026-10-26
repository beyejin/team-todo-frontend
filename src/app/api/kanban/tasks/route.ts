import { proxyKanban } from "../proxy";

export async function GET(request: Request): Promise<Response> {
  return proxyKanban(request);
}

export async function POST(request: Request): Promise<Response> {
  return proxyKanban(request);
}
