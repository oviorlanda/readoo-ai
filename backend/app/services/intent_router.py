"""Intent Router Service to analyze user intent and optimize search execution."""
import logging
import re
from typing import Dict, Any

logger = logging.getLogger(__name__)


class IntentRouterService:
    """Fast Intent Router for query intent classification and search optimization."""

    GREETING_PATTERNS = [
        r"^\b(halo|hai|hi|hello|pagi|siang|sore|malam|selamat pagi|selamat siang|selamat sore|selamat malam|assalamualaikum|hei|hey)\b"
    ]

    GRATITUDE_PATTERNS = [
        r"\b(terima kasih|makasih|thanks|thank you|maturnuwun|trims)\b"
    ]

    @classmethod
    def analyze_intent(cls, query: str) -> Dict[str, Any]:
        """
        Analyze user intent without heavy LLM latency when possible.
        Returns a dict:
            {
                "need_rag": bool,
                "intent_type": "greeting" | "gratitude" | "knowledge_search" | "general_qa",
                "clean_query": str,
                "confidence": float
            }
        """
        cleaned = query.strip()
        lower_q = cleaned.lower()

        # Check Greeting
        for pattern in cls.GREETING_PATTERNS:
            if re.search(pattern, lower_q):
                logger.info("Intent Router detected: GREETING for query '%s'", query[:30])
                return {
                    "need_rag": False,
                    "intent_type": "greeting",
                    "clean_query": cleaned,
                    "confidence": 0.98
                }

        # Check Gratitude
        for pattern in cls.GRATITUDE_PATTERNS:
            if re.search(pattern, lower_q):
                logger.info("Intent Router detected: GRATITUDE for query '%s'", query[:30])
                return {
                    "need_rag": False,
                    "intent_type": "gratitude",
                    "clean_query": cleaned,
                    "confidence": 0.95
                }

        # Default to Knowledge Search with RAG
        logger.info("Intent Router detected: KNOWLEDGE_SEARCH for query '%s'", query[:30])
        return {
            "need_rag": True,
            "intent_type": "knowledge_search",
            "clean_query": cleaned,
            "confidence": 0.90
        }
