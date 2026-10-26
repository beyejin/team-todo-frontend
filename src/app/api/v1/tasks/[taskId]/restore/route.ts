import { proxyTasks } from "../../proxy";

export async function POST(
  request: Request,
  context: RouteContext<"/api/v1/tasks/[taskId]/restore">,
): Promise<Response> {
  const { taskId } = await context.params;
  return proxyTasks(request, { kind: "restore", id: taskId });
}
