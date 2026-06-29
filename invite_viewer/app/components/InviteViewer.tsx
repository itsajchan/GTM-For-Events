"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { Candidate, LoadedReport } from "../lib/report-shape";
import { normalizeReport } from "../lib/report-shape";

type SortKey = "score-desc" | "score-asc" | "name" | "company";

type ReportStats = {
  candidateCount: number;
  averageScore: number;
  topScore: number;
  companyCount: number;
};

const unknownCompany = "Unknown company";

function candidateScore(candidate: Candidate): number {
  return typeof candidate.relevance_score === "number"
    ? candidate.relevance_score
    : 0;
}

function companyName(candidate: Candidate): string {
  return candidate.company?.trim() || unknownCompany;
}

function scoreTone(score: number): string {
  if (score >= 95) {
    return "border-[#3d7ffc] bg-[#eaf2ff] text-[#0a3d91]";
  }

  if (score >= 85) {
    return "border-[#62d895] bg-[#ecfff4] text-[#075837]";
  }

  return "border-[#ffca36] bg-[#fff7d6] text-[#6b5300]";
}

function reportLabel(fileName: string): string {
  return fileName.replace(/\.json$/i, "").replaceAll("-", " ");
}

function reportStats(report?: LoadedReport): ReportStats {
  const candidates = report?.candidates ?? [];
  const scores = candidates.map(candidateScore);
  const total = scores.reduce((sum, score) => sum + score, 0);
  const companies = new Set(candidates.map(companyName));

  return {
    candidateCount: candidates.length,
    averageScore: scores.length ? Math.round(total / scores.length) : 0,
    topScore: scores.length ? Math.max(...scores) : 0,
    companyCount: companies.size,
  };
}

function candidateSearchText(candidate: Candidate): string {
  return [
    candidate.name,
    candidate.headline,
    candidate.company,
    candidate.city_signal,
    candidate.relevance_rationale,
    ...(candidate.evidence ?? []),
    ...(candidate.source_queries ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreLabel(score: number): string {
  return score ? `${score}` : "n/a";
}

function sortCandidates(candidates: Candidate[], sortBy: SortKey): Candidate[] {
  const sorted = [...candidates];

  sorted.sort((a, b) => {
    if (sortBy === "score-asc") {
      return candidateScore(a) - candidateScore(b);
    }

    if (sortBy === "name") {
      return (a.name ?? "").localeCompare(b.name ?? "");
    }

    if (sortBy === "company") {
      return (
        companyName(a).localeCompare(companyName(b)) ||
        candidateScore(b) - candidateScore(a)
      );
    }

    return candidateScore(b) - candidateScore(a);
  });

  return sorted;
}

export default function InviteViewer({
  initialReports,
}: {
  initialReports: LoadedReport[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [activeReportId, setActiveReportId] = useState(
    initialReports[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [company, setCompany] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("score-desc");
  const [importError, setImportError] = useState("");

  const activeReport = useMemo(
    () => reports.find((report) => report.id === activeReportId) ?? reports[0],
    [activeReportId, reports],
  );

  function resetControls() {
    setQuery("");
    setMinScore(0);
    setCompany("all");
    setSortBy("score-desc");
  }

  function selectReport(reportId: string) {
    setActiveReportId(reportId);
    resetControls();
  }

  const stats = useMemo(() => reportStats(activeReport), [activeReport]);

  const companies = useMemo(() => {
    const values = new Set(
      (activeReport?.candidates ?? []).map((candidate) =>
        companyName(candidate),
      ),
    );

    return [...values].sort((a, b) => a.localeCompare(b));
  }, [activeReport]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const candidates = activeReport?.candidates ?? [];

    return sortCandidates(
      candidates.filter((candidate) => {
        const score = candidateScore(candidate);
        const matchesScore = score >= minScore;
        const matchesCompany =
          company === "all" || companyName(candidate) === company;
        const matchesQuery =
          !normalizedQuery ||
          candidateSearchText(candidate).includes(normalizedQuery);

        return matchesScore && matchesCompany && matchesQuery;
      }),
      sortBy,
    );
  }, [activeReport, company, minScore, query, sortBy]);

  async function importReports(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const importedReports: LoadedReport[] = [];
    const failures: string[] = [];

    for (const [index, file] of files.entries()) {
      try {
        const parsed = JSON.parse(await file.text());
        const report = normalizeReport(parsed, file.name, true);
        importedReports.push({
          ...report,
          id: `imported:${Date.now()}:${index}:${file.name}`,
        });
      } catch {
        failures.push(file.name);
      }
    }

    if (importedReports.length) {
      setReports((current) => [...current, ...importedReports]);
      setActiveReportId(importedReports[0].id);
      resetControls();
    }

    setImportError(
      failures.length
        ? `Could not read ${failures.join(", ")} as report JSON.`
        : "",
    );

    event.target.value = "";
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#091b36]">
      <section className="bg-[#091b36] text-white">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
            <a
              className="flex w-fit items-center gap-3 text-white"
              href="https://brightdata.com"
              rel="noreferrer"
              target="_blank"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[16px] bg-[#3d7ffc] text-sm font-semibold">
                BD
              </span>
              <span className="text-lg font-semibold">Bright Data</span>
            </a>

            <div className="flex flex-wrap items-center gap-2 text-sm text-white/75">
              <Link
                className="rounded-[16px] border border-white/15 px-3 py-1 font-semibold transition hover:border-white/35 hover:text-white"
                href="/"
              >
                About tool
              </Link>
              <span className="rounded-[16px] border border-white/15 px-3 py-1">
                Dashboard
              </span>
              <span className="rounded-[16px] border border-white/15 px-3 py-1">
                GTM event workflow
              </span>
              <span className="rounded-[16px] border border-white/15 px-3 py-1">
                Public web signals
              </span>
            </div>
          </header>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.65fr)] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-[#8db5ff]">
                GTM My Events by Bright Data
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
                Event invite dashboard.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/78 md:text-lg">
                Review agent-generated research, compare event runs, and build
                a focused outreach list from structured public web evidence.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-[16px] bg-[#3d7ffc] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f6ee8]">
                  Import report JSON
                  <input
                    className="sr-only"
                    type="file"
                    accept=".json,application/json"
                    multiple
                    onChange={importReports}
                  />
                </label>

                {activeReport?.event_url ? (
                  <a
                    className="inline-flex items-center justify-center rounded-[16px] border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
                    href={activeReport.event_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open event page
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/8 p-4 shadow-2xl shadow-black/20 backdrop-blur">
              <p className="text-xs font-semibold uppercase text-[#8db5ff]">
                Active research run
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {activeReport
                  ? reportLabel(activeReport.fileName)
                  : "No reports found"}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/72">
                <span>{activeReport?.city ?? "No city listed"}</span>
                <span>·</span>
                <span>{stats.candidateCount} prospects</span>
                {activeReport?.imported ? (
                  <span className="rounded-[16px] bg-[#fff7d6] px-2.5 py-1 text-xs font-semibold text-[#6b5300]">
                    Imported
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/68">
                Use this workspace to compare report runs, filter by fit score
                and account, then inspect the evidence before sending prospects
                to sales, community, or field marketing.
              </p>
            </div>
          </div>

          {importError ? (
            <div className="rounded-lg border border-[#ffca36] bg-[#fff7d6] px-4 py-3 text-sm font-medium text-[#6b5300]">
              {importError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Prospects" value={stats.candidateCount} />
            <Metric label="Top fit score" value={scoreLabel(stats.topScore)} />
            <Metric
              label="Average fit"
              value={scoreLabel(stats.averageScore)}
            />
            <Metric label="Target accounts" value={stats.companyCount} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1480px] flex-col lg:flex-row">
        <aside className="w-full border-b border-[#d9e3ef] bg-white lg:min-h-[calc(100vh-220px)] lg:w-[328px] lg:border-b-0 lg:border-r">
          <div className="p-4 sm:p-6 lg:sticky lg:top-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[#3d7ffc]">
                  Event runs
                </p>
                <h2 className="mt-1 text-base font-semibold">
                  Research reports
                </h2>
              </div>
              <span className="rounded-[16px] bg-[#edf3ff] px-2.5 py-1 text-xs font-semibold text-[#0a3d91]">
                {reports.length}
              </span>
            </div>

            <div className="grid gap-2">
              {reports.map((report) => {
                const reportMetric = reportStats(report);
                const isActive = report.id === activeReport?.id;

                return (
                  <button
                    className={[
                      "w-full rounded-lg border p-3 text-left transition",
                      isActive
                        ? "border-[#3d7ffc] bg-[#edf3ff] shadow-sm"
                        : "border-[#e2e9f2] bg-white hover:border-[#9bbdff] hover:bg-[#f8fbff]",
                    ].join(" ")}
                    key={report.id}
                    onClick={() => selectReport(report.id)}
                    type="button"
                  >
                    <span className="block min-w-0 text-sm font-semibold text-[#091b36]">
                      {reportLabel(report.fileName)}
                    </span>
                    <span className="mt-1 block text-xs text-[#526373]">
                      {report.city ?? "No city"} · {reportMetric.candidateCount}{" "}
                      prospects
                    </span>
                  </button>
                );
              })}

              {!reports.length ? (
                <div className="rounded-lg border border-dashed border-[#b9c9db] bg-[#f8fbff] p-4 text-sm text-[#526373]">
                  No report JSON files were found in the reports directory.
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          {activeReport ? (
            <div className="grid gap-5">
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <InfoPanel
                  eyebrow="Event intelligence"
                  title="Event brief"
                  body={
                    activeReport.event_summary ??
                    "No event summary included in this report."
                  }
                />
                <InfoPanel
                  eyebrow="GTM fit"
                  title="Audience hypothesis"
                  body={
                    activeReport.audience_hypothesis ??
                    "No audience hypothesis included in this report."
                  }
                />
              </section>

              <section className="rounded-lg border border-[#d9e3ef] bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase text-[#3d7ffc]">
                    Prioritize the room
                  </p>
                  <h2 className="text-lg font-semibold">Prospect controls</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(220px,1.4fr)_minmax(150px,0.7fr)_minmax(180px,0.8fr)_minmax(170px,0.7fr)]">
                  <label className="grid gap-1 text-sm font-semibold">
                    Find prospects
                    <input
                      className="h-10 min-w-0 rounded-md border border-[#c8d5e3] bg-white px-3 text-sm font-normal text-[#091b36]"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Name, account, rationale"
                      type="search"
                      value={query}
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-semibold">
                    Fit score
                    <div className="flex h-10 items-center gap-3 rounded-md border border-[#c8d5e3] bg-white px-3">
                      <input
                        aria-label="Minimum fit score"
                        className="min-w-0 flex-1 accent-[#3d7ffc]"
                        max={100}
                        min={0}
                        onChange={(event) =>
                          setMinScore(Number(event.target.value))
                        }
                        type="range"
                        value={minScore}
                      />
                      <span className="w-8 text-right text-sm font-semibold text-[#0a3d91]">
                        {minScore}
                      </span>
                    </div>
                  </label>

                  <label className="grid gap-1 text-sm font-semibold">
                    Account
                    <select
                      className="h-10 min-w-0 rounded-md border border-[#c8d5e3] bg-white px-3 text-sm font-normal text-[#091b36]"
                      onChange={(event) => setCompany(event.target.value)}
                      value={company}
                    >
                      <option value="all">All accounts</option>
                      {companies.map((companyNameValue) => (
                        <option key={companyNameValue} value={companyNameValue}>
                          {companyNameValue}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm font-semibold">
                    Sort invite list
                    <select
                      className="h-10 min-w-0 rounded-md border border-[#c8d5e3] bg-white px-3 text-sm font-normal text-[#091b36]"
                      onChange={(event) =>
                        setSortBy(event.target.value as SortKey)
                      }
                      value={sortBy}
                    >
                      <option value="score-desc">Fit high to low</option>
                      <option value="score-asc">Fit low to high</option>
                      <option value="name">Name</option>
                      <option value="company">Account</option>
                    </select>
                  </label>
                </div>
              </section>

              <section>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#3d7ffc]">
                      Invite candidates
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      Prioritized prospects
                    </h2>
                    <p className="text-sm text-[#526373]">
                      {filteredCandidates.length} of {stats.candidateCount}
                    </p>
                  </div>
                </div>

                {filteredCandidates.length ? (
                  <div className="grid gap-3">
                    {filteredCandidates.map((candidate, index) => (
                      <CandidateRow
                        candidate={candidate}
                        key={`${candidate.linkedin_url ?? candidate.name}-${index}`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyCandidates report={activeReport} />
                )}
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <ListPanel
                  emptyLabel="No discovery queries included."
                  items={activeReport.search_queries_used ?? []}
                  title="Discovery queries"
                />
                <ListPanel
                  emptyLabel="No data notes included."
                  items={activeReport.caveats ?? []}
                  title="Data notes"
                />
              </section>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#b9c9db] bg-white p-8 text-center text-[#526373]">
              Add a report JSON file to start building an event invite list.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white px-4 py-3 text-[#091b36] shadow-xl shadow-black/10">
      <p className="text-xs font-semibold uppercase text-[#526373]">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function InfoPanel({
  body,
  eyebrow,
  title,
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-[#d9e3ef] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[#3d7ffc]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#526373]">{body}</p>
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: Candidate }) {
  const score = candidateScore(candidate);
  const evidence = candidate.evidence ?? [];
  const queries = candidate.source_queries ?? [];

  return (
    <article className="rounded-lg border border-[#d9e3ef] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div
          className={[
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 text-xl font-semibold",
            scoreTone(score),
          ].join(" ")}
          title="Fit score"
        >
          {scoreLabel(score)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold leading-snug">
                {candidate.linkedin_url ? (
                  <a
                    className="text-[#091b36] underline-offset-4 hover:text-[#3d7ffc] hover:underline"
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {candidate.name ?? "Unnamed prospect"}
                  </a>
                ) : (
                  (candidate.name ?? "Unnamed prospect")
                )}
              </h3>
              <p className="mt-1 text-sm font-medium text-[#526373]">
                {candidate.headline ?? "No headline listed"}
              </p>
            </div>

            <span className="w-fit rounded-[16px] border border-[#d9e3ef] bg-[#f4f7fb] px-2.5 py-1 text-sm font-semibold text-[#091b36]">
              {companyName(candidate)}
            </span>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="text-xs font-semibold uppercase text-[#6f8194]">
                Location signal
              </p>
              <p className="mt-1 text-sm leading-6 text-[#526373]">
                {candidate.city_signal ?? "No location signal listed."}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-[#6f8194]">
                Why invite
              </p>
              <p className="mt-1 text-sm leading-6 text-[#526373]">
                {candidate.relevance_rationale ?? "No rationale listed."}
              </p>
            </div>
          </div>

          {(evidence.length || queries.length) ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <DetailList title="Evidence" items={evidence} />
              <DetailList title="Discovery queries" items={queries} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <details className="group rounded-md border border-[#d9e3ef] bg-[#f8fbff] px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold text-[#0a3d91]">
        {title} · {items.length}
      </summary>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#526373]">
        {items.map((item, index) => (
          <li className="break-words" key={`${title}-${index}`}>
            {item}
          </li>
        ))}
      </ul>
    </details>
  );
}

function EmptyCandidates({ report }: { report: LoadedReport }) {
  const caveats = report.caveats ?? [];

  return (
    <div className="rounded-lg border border-dashed border-[#b9c9db] bg-white p-6">
      <h3 className="text-lg font-semibold">No prospects in this view</h3>
      {caveats.length ? (
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#526373]">
          {caveats.slice(0, 4).map((caveat, index) => (
            <li key={index}>{caveat}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#526373]">
          The selected filters do not match any prospects.
        </p>
      )}
    </div>
  );
}

function ListPanel({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: string[];
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[#d9e3ef] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-[16px] bg-[#edf3ff] px-2.5 py-1 text-xs font-semibold text-[#0a3d91]">
          {items.length}
        </span>
      </div>

      {items.length ? (
        <ol className="grid max-h-[360px] gap-2 overflow-auto pr-2 text-sm leading-6 text-[#526373]">
          {items.map((item, index) => (
            <li className="break-words" key={index}>
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-[#526373]">{emptyLabel}</p>
      )}
    </section>
  );
}
