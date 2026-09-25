import { notFound } from "next/navigation";
import { ProcessAnalysisView } from "@/components/process/ProcessAnalysisView";
import { ApiError, getProcess } from "@/lib/api";

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const process = await getProcess(id);
    return <ProcessAnalysisView process={process} />;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Could not load this process. Is the backend running on port 8000?
      </div>
    );
  }
}
