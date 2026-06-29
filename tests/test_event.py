from invite_finder.event import extract_event_page_context


def test_extract_event_page_context_prefers_meta_description() -> None:
    html = """
    <html>
      <head>
        <title>VLA Night Panel</title>
        <meta name="description" content="A panel for builders in AI and robotics.">
      </head>
      <body><script>ignore()</script><main>Join founders and researchers.</main></body>
    </html>
    """

    context = extract_event_page_context("https://luma.com/vla-night-panel", html)

    assert context.title == "VLA Night Panel"
    assert context.description == "A panel for builders in AI and robotics."
    assert "Join founders and researchers." in context.text
    assert "ignore" not in context.text

