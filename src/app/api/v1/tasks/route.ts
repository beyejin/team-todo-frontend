import { proxyTasks } from "./proxy";

export function GET(request: Request): Promise<Response> {
  return proxyTasks(request, { kind: "collection" });
}

export function POST(request: Request): Promise<Response> {
  return proxyTasks(request, { kind: "collection" });
}
