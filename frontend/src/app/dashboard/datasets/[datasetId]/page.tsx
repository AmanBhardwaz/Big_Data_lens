"use client";

import { useParams } from "next/navigation";
import DatasetWorkspace from "@/components/DatasetWorkspace";

export default function DatasetPage() {
  const params = useParams<{ datasetId: string }>();

  return (
    <DatasetWorkspace
      key={params.datasetId}
      datasetId={params.datasetId}
    />
  );
}