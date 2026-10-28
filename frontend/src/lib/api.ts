const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type DataRow = Record<string, unknown>;

export type ColumnReport = {
  column: string;
  data_type: string;
  missing_values: number;
  missing_percentage: number;
  unique_values: number;
};

export type DatasetReport = {
  total_rows: number;
  total_columns: number;
  duplicate_rows: number;
  total_missing_values: number;
  column_report: ColumnReport[];
  preview: DataRow[];
};

export type UploadResponse = DatasetReport & {
  dataset_id: string;
  filename: string;
  message: string;
};

export type CleaningOptions = {
  trim_spaces: boolean;
  blank_as_missing: boolean;
  remove_duplicates: boolean;
  missing_strategy: "keep" | "drop_rows";
};

export type CleanResponse = {
  dataset_id: string;
  cleaning_id: string;
  message: string;
  before: DatasetReport;
  after: DatasetReport;
  duplicate_rows_removed: number;
  missing_rows_removed: number;
};

export type AskResponse =
  | {
      status: "success";
      question: string;
      calculation: string;
      sql: string;
      rows_returned: number;
      truncated: boolean;
      result: DataRow[];
    }
  | {
      status: "clarification" | "unsupported";
      message: string;
    };

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
    });
  } catch {
    throw new Error(
      "Could not connect to the backend. Check that the server is running on port 8000.",
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;

    throw new Error(
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `Request failed: HTTP ${response.status}`,
    );
  }

  if (data === null) {
    throw new Error("Backend returned an invalid response.");
  }

  return data as T;
}

export function uploadDataset(file: File) {
  const body = new FormData();
  body.append("file", file);

  return request<UploadResponse>("/upload", {
    method: "POST",
    body,
  });
}

export function cleanDataset(
  datasetId: string,
  options: CleaningOptions,
) {
  return request<CleanResponse>(`/datasets/${datasetId}/clean`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
}

export function askDataset(
  datasetId: string,
  cleaningId: string,
  question: string,
) {
  return request<AskWithHistoryResponse>("/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      cleaning_id: cleaningId,
      question,
    }),
  });
}
export type SavedDataset = {
  dataset_id: string;
  filename: string;
  total_rows: number;
  total_columns: number;
  created_at: string;
};

export type DatasetListResponse = {
  datasets: SavedDataset[];
  limit: number;
  offset: number;
};

export type ReopenDatasetResponse = {
  upload: UploadResponse;
  latest_cleaning:
    | (CleanResponse & {
        options: CleaningOptions;
      })
    | null;
};

export function listDatasets(limit = 20, offset = 0) {
  return request<DatasetListResponse>(
    `/datasets?limit=${limit}&offset=${offset}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export function reopenDataset(datasetId: string) {
  return request<ReopenDatasetResponse>(
    `/datasets/${encodeURIComponent(datasetId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}
export type HistoryItem = {
  id: string;
  question: string;
  status: "success" | "clarification" | "unsupported";
  cleaning_id: string;
  created_at: string;
};

export type HistoryListResponse = {
  items: HistoryItem[];
  has_more: boolean;
};

export type HistoryDetail = {
  id: string;
  question: string;
  cleaning_id: string;
  created_at: string;
  response: AskResponse;
};

export type AskWithHistoryResponse = AskResponse & {
  history_saved: boolean;
  history_id: string | null;
};

export function getQueryHistory(datasetId: string, offset = 0) {
  return request<HistoryListResponse>(
    `/datasets/${encodeURIComponent(datasetId)}/history?limit=20&offset=${offset}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export function getHistoryResult(datasetId: string, historyId: string) {
  return request<HistoryDetail>(
    `/datasets/${encodeURIComponent(datasetId)}/history/${encodeURIComponent(historyId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}
export type AnalysisColumn = {
  column: string;
  dtype: string;
  missing: number;
  missing_percent: number;
  unique: number;
  constant: boolean;
};

export type NumericAnalysis = {
  column: string;
  valid_count: number;
  missing_count: number;
  non_finite_count: number;
  minimum: number | null;
  maximum: number | null;
  mean: number | null;
  median: number | null;
  std: number | null;
  bins: {
    lower: number;
    upper: number;
    count: number;
    includes_upper: boolean;
  }[];
  histogram_note: string | null;
};

export type CategoryAnalysis = {
  column: string;
  unique: number;
  non_missing_count: number;
  top: { label: string; count: number }[];
  other_count: number;
};

export type AutomaticAnalysisReport = {
  analysis_version: number;
  dataset_id: string;
  cleaning_id: string;
  created_at: string;
  advanced: AdvancedInsightsReport;
  scope: "full_cleaned_dataset";
  summary: {
    rows: number;
    columns: number;
    missing_cells: number;
    missing_percent: number;
    duplicate_rows: number;
    numeric_columns: number;
  };
  columns: AnalysisColumn[];
  numeric: NumericAnalysis[];
  categories: CategoryAnalysis[];
  findings: string[];
};

export function getSavedAnalysis(
  datasetId: string,
  cleaningId: string,
) {
  const params = new URLSearchParams({ cleaning_id: cleaningId });

  return request<{ analysis: AutomaticAnalysisReport | null }>(
    `/datasets/${encodeURIComponent(datasetId)}/analysis?${params}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export function runAutomaticAnalysis(
  datasetId: string,
  cleaningId: string,
  force = false,
) {
  const params = new URLSearchParams({
    cleaning_id: cleaningId,
    force: String(force),
  });

  return request<{ analysis: AutomaticAnalysisReport }>(
    `/datasets/${encodeURIComponent(datasetId)}/analysis?${params}`,
    {
      method: "POST",
    },
  );
}
export type RecommendationItem = {
  id: string;
  priority: "high" | "medium" | "low" | "info";
  title: string;
  column: string | null;
  evidence: string;
  action: string;
};

export type RecommendationReport = {
  dataset_id: string;
  cleaning_id: string;
  analysis_created_at: string;
  created_at: string;
  rule_version: number;
  method: "rule_based";
  thresholds: {
    high_missing_percent: number;
    category_concentration_percent: number;
    minimum_category_rows: number;
  };
  items: RecommendationItem[];
};

export function getSavedRecommendations(
  datasetId: string,
  cleaningId: string,
) {
  const params = new URLSearchParams({ cleaning_id: cleaningId });

  return request<{
    recommendations: RecommendationReport | null;
    analysis_required: boolean;
  }>(
    `/datasets/${encodeURIComponent(datasetId)}/recommendations?${params}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export function generateRecommendations(
  datasetId: string,
  cleaningId: string,
) {
  const params = new URLSearchParams({ cleaning_id: cleaningId });

  return request<{ recommendations: RecommendationReport }>(
    `/datasets/${encodeURIComponent(datasetId)}/recommendations?${params}`,
    {
      method: "POST",
    },
  );
}
export type CorrelationInsight = {
  left: string;
  right: string;
  paired_rows: number;
  excluded_rows: number;
  coefficient: number | null;
  reason: string | null;
};

export type OutlierInsight = {
  column: string;
  valid_rows: number;
  excluded_rows: number;
  q1: number | null;
  q3: number | null;
  lower: number | null;
  upper: number | null;
  count: number | null;
  percent: number | null;
  examples: {
    cleaned_row: number;
    value: number;
  }[];
  reason: string | null;
};

export type AdvancedInsightsReport = {
  method: string;
  min_paired_rows: number;
  min_outlier_rows: number;
  max_columns: number;
  selected_columns: string[];
  excluded_columns: {
    column: string;
    reason: string;
  }[];
  correlations: CorrelationInsight[];
  outliers: OutlierInsight[];
};
export type TrendSettings = {
  time_column: string;
  metric: string;
  date_format: "year" | "month" | "ymd" | "dmy" | "mdy";
  period: "year" | "month" | "day";
  aggregation: "avg" | "sum" | "min" | "max";
};

export type TrendReport = {
  trend_version: number;
  dataset_id: string;
  cleaning_id: string;
  created_at: string;
  settings: TrendSettings;
  total_rows: number;
  valid_rows: number;
  invalid_time_rows: number;
  invalid_metric_rows: number;
  excluded_rows: number;
  missing_periods: number;
  points: {
    date: string;
    period_label: string;
    value: number;
    row_count: number;
    change_percent: number | null;
    gap_before: number;
  }[];
};

export function getSavedTrend(datasetId: string, cleaningId: string) {
  const params = new URLSearchParams({ cleaning_id: cleaningId });

  return request<{ trend: TrendReport | null }>(
    `/datasets/${encodeURIComponent(datasetId)}/trend?${params}`,
    { method: "GET", cache: "no-store" },
  );
}

export function calculateTrend(
  datasetId: string,
  cleaningId: string,
  settings: TrendSettings,
) {
  return request<{ trend: TrendReport }>(
    `/datasets/${encodeURIComponent(datasetId)}/trend`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cleaning_id: cleaningId,
        ...settings,
      }),
    },
  );
}