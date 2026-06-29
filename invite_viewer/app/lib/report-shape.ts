export type Candidate = {
  name?: string;
  linkedin_url?: string;
  headline?: string;
  company?: string;
  city_signal?: string;
  relevance_score?: number;
  relevance_rationale?: string;
  evidence?: string[];
  source_queries?: string[];
};

export type InviteReport = {
  event_url?: string;
  city?: string;
  event_summary?: string;
  audience_hypothesis?: string;
  search_queries_used?: string[];
  candidates?: Candidate[];
  caveats?: string[];
};

export type LoadedReport = InviteReport & {
  id: string;
  fileName: string;
  imported?: boolean;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asCandidate(value: unknown): Candidate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  return {
    name: typeof candidate.name === "string" ? candidate.name : undefined,
    linkedin_url:
      typeof candidate.linkedin_url === "string"
        ? candidate.linkedin_url
        : undefined,
    headline:
      typeof candidate.headline === "string" ? candidate.headline : undefined,
    company:
      typeof candidate.company === "string" ? candidate.company : undefined,
    city_signal:
      typeof candidate.city_signal === "string"
        ? candidate.city_signal
        : undefined,
    relevance_score:
      typeof candidate.relevance_score === "number"
        ? candidate.relevance_score
        : undefined,
    relevance_rationale:
      typeof candidate.relevance_rationale === "string"
        ? candidate.relevance_rationale
        : undefined,
    evidence: asStringArray(candidate.evidence),
    source_queries: asStringArray(candidate.source_queries),
  };
}

export function normalizeReport(
  input: unknown,
  fileName: string,
  imported = false,
): LoadedReport {
  const report =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const rawCandidates = Array.isArray(report.candidates)
    ? report.candidates
    : [];

  return {
    id: `${imported ? "imported" : "local"}:${fileName}`,
    fileName,
    imported,
    event_url:
      typeof report.event_url === "string" ? report.event_url : undefined,
    city: typeof report.city === "string" ? report.city : undefined,
    event_summary:
      typeof report.event_summary === "string"
        ? report.event_summary
        : undefined,
    audience_hypothesis:
      typeof report.audience_hypothesis === "string"
        ? report.audience_hypothesis
        : undefined,
    search_queries_used: asStringArray(report.search_queries_used),
    candidates: rawCandidates
      .map(asCandidate)
      .filter((candidate): candidate is Candidate => candidate !== null),
    caveats: asStringArray(report.caveats),
  };
}
