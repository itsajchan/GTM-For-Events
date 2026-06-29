from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup
import requests

from invite_finder.config import Settings


class BrightDataError(RuntimeError):
    """Raised when Bright Data returns an unsuccessful response."""


@dataclass(frozen=True)
class SerpResult:
    title: str
    link: str
    description: str
    rank: int | None
    source_query: str


class BrightDataClient:
    """Small REST client for Bright Data SERP API and Web Unlocker."""

    def __init__(self, settings: Settings, session: requests.Session | None = None):
        self.settings = settings
        self.session = session or requests.Session()

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.settings.brightdata_api_key}",
            "Content-Type": "application/json",
        }

    def _post_request(self, payload: dict[str, Any]) -> Any:
        response = self.session.post(
            self.settings.brightdata_request_endpoint,
            headers=self._headers,
            json=payload,
            timeout=self.settings.brightdata_timeout_seconds,
        )
        if response.status_code >= 400:
            raise BrightDataError(
                f"Bright Data request failed with {response.status_code}: "
                f"{response.text[:1000]}"
            )

        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                return response.json()
            except json.JSONDecodeError as exc:
                raise BrightDataError("Bright Data returned invalid JSON") from exc
        return response.text

    def _serp_results_from_html(
        self,
        html: str,
        query: str,
        *,
        limit: int,
    ) -> list[SerpResult]:
        soup = BeautifulSoup(html, "html.parser")
        results: list[SerpResult] = []
        seen: set[str] = set()

        for anchor in soup.find_all("a", href=True):
            link = self._extract_google_link(anchor["href"])
            if not link or "linkedin.com/in/" not in link.lower():
                continue
            if link in seen:
                continue

            seen.add(link)
            title = " ".join(anchor.get_text(" ", strip=True).split())
            parent = anchor.find_parent("div")
            description = ""
            if parent:
                description = " ".join(parent.get_text(" ", strip=True).split())
            results.append(
                SerpResult(
                    title=title,
                    link=link,
                    description=description[:800],
                    rank=len(results) + 1,
                    source_query=query,
                )
            )
            if len(results) >= limit:
                break

        return results

    @staticmethod
    def _extract_google_link(href: str) -> str | None:
        parsed = urlparse(href)
        if parsed.path == "/url" and parsed.query:
            candidates = parse_qs(parsed.query).get("q") or []
            return candidates[0] if candidates else None
        if parsed.netloc.endswith("google.com") and parsed.path == "/url":
            candidates = parse_qs(parsed.query).get("q") or []
            return candidates[0] if candidates else None
        if parsed.scheme in {"http", "https"}:
            return href
        return None

    def unlock_url(
        self,
        url: str,
        *,
        data_format: str | None = "markdown",
        response_format: str = "raw",
        country: str | None = None,
    ) -> str:
        """Fetch a public webpage through Bright Data Web Unlocker."""
        payload: dict[str, Any] = {
            "zone": self.settings.brightdata_unlocker_zone,
            "url": url,
            "format": response_format,
            "method": "GET",
        }
        if country:
            payload["country"] = country
        if data_format:
            payload["data_format"] = data_format

        data = self._post_request(payload)
        if isinstance(data, dict):
            body = data.get("body")
            if isinstance(body, str):
                return body
            if body is not None:
                return json.dumps(body)
            return json.dumps(data)
        return str(data)

    def google_search(
        self,
        query: str,
        *,
        limit: int = 10,
        start: int = 0,
        language: str = "en",
        country: str | None = None,
    ) -> list[SerpResult]:
        """Run a Google search through Bright Data SERP API."""
        gl = country or self.settings.brightdata_country
        params = {
            "q": query,
            "hl": language,
            "gl": gl,
            "num": max(1, min(limit, 100)),
        }
        if start:
            params["start"] = start

        google_url = f"https://www.google.com/search?{urlencode(params)}"
        payload = {
            "zone": self.settings.brightdata_serp_zone,
            "url": google_url,
            "format": "json",
            "method": "GET",
            "country": gl,
        }

        data = self._post_request(payload)
        if not isinstance(data, dict):
            raise BrightDataError("Bright Data SERP response was not JSON")

        organic = data.get("organic") or data.get("results") or []
        body = data.get("body")
        if not organic and isinstance(body, str):
            stripped = body.strip()
            if stripped.startswith("{"):
                try:
                    body_data = json.loads(stripped)
                except json.JSONDecodeError:
                    body_data = {}
                if isinstance(body_data, dict):
                    organic = body_data.get("organic") or body_data.get("results") or []
            if not organic:
                return self._serp_results_from_html(body, query, limit=limit)

        results: list[SerpResult] = []
        for index, item in enumerate(organic, start=1):
            if not isinstance(item, dict):
                continue
            link = item.get("link") or item.get("url")
            if not link:
                continue
            results.append(
                SerpResult(
                    title=str(item.get("title") or ""),
                    link=str(link),
                    description=str(
                        item.get("description")
                        or item.get("snippet")
                        or item.get("text")
                        or ""
                    ),
                    rank=item.get("rank") if isinstance(item.get("rank"), int) else index,
                    source_query=query,
                )
            )
        return results
