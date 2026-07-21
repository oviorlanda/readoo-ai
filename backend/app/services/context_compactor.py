"""Context Compactor Service to compress and optimize retrieved RAG context."""
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)


class ContextCompactorService:
    """Service to deduplicate and compact RAG search results for LLM prompt context."""

    @classmethod
    def compact_context(
        cls,
        documents: List[Dict[str, Any]],
        display_cols: List[str],
        max_context_items: int = 5
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Deduplicate, filter, and compact document context.
        Returns (compact_context_str, filtered_documents).
        """
        if not documents:
            return "Tidak ada dokumen atau data relevan ditemukan.", []

        seen_signatures = set()
        unique_docs = []

        for doc in documents:
            # Create signature from key fields
            sig_parts = []
            for col in display_cols:
                if col in doc:
                    sig_parts.append(str(doc[col]).strip().lower())
            sig = "||".join(sig_parts)

            if sig and sig not in seen_signatures:
                seen_signatures.add(sig)
                unique_docs.append(doc)

            if len(unique_docs) >= max_context_items:
                break

        # Build compact context string
        context_str_parts = []
        for idx, doc in enumerate(unique_docs, 1):
            item_lines = [f"Item #{idx}:"]
            for col in display_cols:
                if col in doc and doc[col]:
                    item_lines.append(f"{col.capitalize()}: {doc[col]}")
            context_str_parts.append("\n".join(item_lines))

        compact_str = "\n\n".join(context_str_parts)
        logger.info("Context Compactor reduced %d docs to %d unique docs.", len(documents), len(unique_docs))

        return compact_str, unique_docs
