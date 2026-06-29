from invite_finder.brightdata import BrightDataClient
from invite_finder.config import Settings


def _client() -> BrightDataClient:
    return BrightDataClient(
        Settings(
            brightdata_api_key="test",
            brightdata_serp_zone="serp",
            brightdata_unlocker_zone="unlocker",
        )
    )


def test_extract_google_link_from_redirect() -> None:
    href = "/url?q=https://www.linkedin.com/in/example-person/&sa=U"

    assert (
        BrightDataClient._extract_google_link(href)
        == "https://www.linkedin.com/in/example-person/"
    )


def test_serp_results_from_html_extracts_linkedin_profiles() -> None:
    html = """
    <html>
      <body>
        <a href="/url?q=https://www.linkedin.com/in/example-person/&sa=U">
          Example Person - Robotics Founder
        </a>
        <a href="https://www.example.com/not-linkedin">Ignore me</a>
      </body>
    </html>
    """

    results = _client()._serp_results_from_html(html, "query", limit=10)

    assert len(results) == 1
    assert results[0].link == "https://www.linkedin.com/in/example-person/"
    assert results[0].title == "Example Person - Robotics Founder"

