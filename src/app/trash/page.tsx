import { Suspense } from "react";
import { TaskBoard } from "@/components/task-board";

/** Deleted tasks remain available for restoration. */
export default function TrashPage() {
  return (
    <Suspense>
      <TaskBoard trash />
    </Suspense>
  );
}
