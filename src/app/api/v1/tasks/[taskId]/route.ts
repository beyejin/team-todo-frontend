import { proxyTasks } from "../proxy";

export async function GET(
  request: Request,
  context: RouteContext<"/api/v1/tasks/[taskId]">,
): Promise<Response> {
  const { taskId } = await context.params;
  return proxyTasks(request, { kind: "task", id: taskId });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/v1/tasks/[taskId]">,
): Promise<Response> {
  const { taskId } = await context.params;
  return proxyTasks(request, { kind: "task", id: taskId });
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/v1/tasks/[taskId]">,
): Promise<Response> {
  const { taskId } = await context.params;
  return proxyTasks(request, { kind: "task", id: taskId });
}
