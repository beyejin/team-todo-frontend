import { Suspense } from "react";
import { TaskBoard } from "@/components/task-board";

/** Start in the task list, without a theme selection gate. */
export default function Home() {
  return (
    <Suspense>
      <TaskBoard />
    </Suspense>
  );
}
