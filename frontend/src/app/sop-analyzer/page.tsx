import { SopAnalyzer } from "@/components/sop/SopAnalyzer";
import { listDocuments } from "@/lib/api";
import type { DocumentRead } from "@/lib/types";

export default async function SopAnalyzerPage() {
  let documents: DocumentRead[] = [];
  try {
    documents = await listDocuments();
  } catch {
    documents = [];
  }
  return <SopAnalyzer initialDocuments={documents} />;
}
