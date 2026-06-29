import argparse

from invite_finder.cli import _default_serp_results_per_query


def test_default_serp_results_per_query_scales_with_profile_target() -> None:
    args = argparse.Namespace(max_profiles=200, max_serp_queries=12)

    assert _default_serp_results_per_query(args) == 34


def test_default_serp_results_per_query_keeps_small_runs_at_ten() -> None:
    args = argparse.Namespace(max_profiles=20, max_serp_queries=12)

    assert _default_serp_results_per_query(args) == 10

