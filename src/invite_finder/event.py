from __future__ import annotations

import re
from dataclasses import dataclass

from bs4 import BeautifulSoup


MAX_EVENT_TEXT_CHARS = 12000


@dataclass(frozen=True)
class EventPageContext:
    url: str
    title: str
    description: str
    text: str


def compact_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def extract_event_page_context(url: str, page_content: str) -> EventPageContext:
    """Extract enough event-page text for the agent to reason over."""
    soup = BeautifulSoup(page_content, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = compact_whitespace(soup.title.string)

    description = ""
    for selector in (
        {"property": "og:description"},
        {"name": "description"},
        {"name": "twitter:description"},
    ):
        node = soup.find("meta", attrs=selector)
        if node and node.get("content"):
            description = compact_whitespace(str(node["content"]))
            break

    if not title:
        node = soup.find("meta", attrs={"property": "og:title"})
        if node and node.get("content"):
            title = compact_whitespace(str(node["content"]))

    text = soup.get_text(separator="\n")
    lines = [compact_whitespace(line) for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)

    if not text:
        text = compact_whitespace(page_content)

    return EventPageContext(
        url=url,
        title=title,
        description=description,
        text=text[:MAX_EVENT_TEXT_CHARS],
    )

