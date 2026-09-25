import { notFound } from "next/navigation";
import { FutureStateView } from "@/components/workflow/FutureStateView";
import { ApiError, getProcess, getWorkflow } from "@/lib/api";
import type { ProcessRead } from "@/lib/types";

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const workflow = await getWorkflow(id);
    let process: ProcessRead | null = null;
    if (workflow.process_id) {
      process = await getProcess(workflow.process_id).catch(() => null);
    }
    return <FutureStateView workflow={workflow} process={process} />;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Could not load this workflow. Is the backend running on port 8000?
      </div>
    );
  }
}
