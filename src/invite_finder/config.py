from __future__ import annotations

import os
from dataclasses import dataclass


class ConfigError(RuntimeError):
    """Raised when required runtime configuration is missing."""


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer") from exc


@dataclass(frozen=True)
class Settings:
    brightdata_api_key: str
    brightdata_serp_zone: str
    brightdata_unlocker_zone: str
    brightdata_request_endpoint: str = "https://api.brightdata.com/request"
    brightdata_timeout_seconds: int = 60
    brightdata_country: str = "us"
    openai_agent_model: str = "gpt-5.5"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            brightdata_api_key=_required_env("BRIGHTDATA_API_KEY"),
            brightdata_serp_zone=_required_env("BRIGHTDATA_SERP_ZONE"),
            brightdata_unlocker_zone=_required_env("BRIGHTDATA_UNLOCKER_ZONE"),
            brightdata_request_endpoint=os.getenv(
                "BRIGHTDATA_REQUEST_ENDPOINT",
                "https://api.brightdata.com/request",
            ),
            brightdata_timeout_seconds=_int_env("BRIGHTDATA_TIMEOUT_SECONDS", 60),
            brightdata_country=os.getenv("BRIGHTDATA_COUNTRY", "us"),
            openai_agent_model=os.getenv("OPENAI_AGENT_MODEL", "gpt-5.5"),
        )

