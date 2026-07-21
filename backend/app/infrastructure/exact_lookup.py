"""Exact Lookup & Semantic Cache Service for fast-path responses."""
import hashlib
import json
import logging
from typing import Optional
from app.infrastructure.cache import cache_get, cache_set

logger = logging.getLogger(__name__)


class ExactLookupService:
    """Fast-path lookup service using cache backend."""

    CACHE_PREFIX = "exact_lookup:"
    DEFAULT_TTL = 86400  # 24 hours

    @classmethod
    def _normalize_query(cls, query: str) -> str:
        """Normalize query string for exact matching."""
        return " ".join(query.strip().lower().split())

    @classmethod
    def _hash_query(cls, query: str) -> str:
        """Generate MD5 hash of normalized query."""
        normalized = cls._normalize_query(query)
        return hashlib.md5(normalized.encode("utf-8")).hexdigest()

    @classmethod
    def get_cached_response(cls, query: str) -> Optional[dict]:
        """
        Check if an exact response exists in cache for the given query.
        Returns response payload dict or None.
        """
        key = f"{cls.CACHE_PREFIX}{cls._hash_query(query)}"
        cached_data = cache_get(key)
        if cached_data:
            try:
                logger.info("Exact Lookup HIT for query: '%s'", query[:40])
                payload = json.loads(cached_data)
                payload["fast_path"] = True
                return payload
            except Exception as e:
                logger.error("Failed to parse cached response: %s", e)
        return None

    @classmethod
    def set_cached_response(cls, query: str, response_text: str, items: list = None, sources: list = None, ttl: int = DEFAULT_TTL) -> None:
        """Cache a verified high-confidence response for future fast-path lookups."""
        if not query or not response_text:
            return
        key = f"{cls.CACHE_PREFIX}{cls._hash_query(query)}"
        payload = {
            "reply": response_text,
            "items": items or [],
            "sources": sources or [],
            "cached_at": cls._normalize_query(query)
        }
        try:
            cache_set(key, json.dumps(payload), ttl=ttl)
            logger.info("Cached fast-path response for query: '%s'", query[:40])
        except Exception as e:
            logger.error("Failed to cache exact lookup response: %s", e)
