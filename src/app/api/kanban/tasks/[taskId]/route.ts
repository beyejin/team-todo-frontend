import { proxyKanban } from "../../proxy";

export async function GET(
  request: Request,
  context: RouteContext<"/api/kanban/tasks/[taskId]">,
): Promise<Response> {
  const { taskId } = await context.params;
  return proxyKanban(request, taskId);
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/kanban/tasks/[taskId]">,
): Promise<Response> {
  const { taskId } = await context.params;
  return proxyKanban(request, taskId);
}
