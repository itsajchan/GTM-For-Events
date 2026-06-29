from __future__ import annotations

from pydantic import BaseModel, Field


class CandidateProfile(BaseModel):
    name: str | None = Field(default=None, description="Best-effort public name.")
    linkedin_url: str = Field(description="Public LinkedIn profile URL.")
    headline: str | None = Field(default=None, description="Best-effort role/headline.")
    company: str | None = Field(default=None, description="Best-effort company.")
    city_signal: str | None = Field(
        default=None,
        description="Evidence that the person is tied to the requested city.",
    )
    relevance_score: int = Field(
        ge=0,
        le=100,
        description="Estimated fit for the event based only on public evidence.",
    )
    relevance_rationale: str = Field(
        description="Brief explanation of why the profile may be relevant."
    )
    evidence: list[str] = Field(
        default_factory=list,
        description="Short snippets or search result evidence supporting the match.",
    )
    source_queries: list[str] = Field(
        default_factory=list,
        description="SERP queries that surfaced this profile.",
    )


class ProfileSearchReport(BaseModel):
    event_url: str
    city: str
    event_summary: str
    audience_hypothesis: str
    search_queries_used: list[str]
    candidates: list[CandidateProfile]
    caveats: list[str] = Field(default_factory=list)

