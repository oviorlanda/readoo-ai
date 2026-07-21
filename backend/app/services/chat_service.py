import os
import re
import json
import uuid
import time
import logging
from typing import Generator, Optional

import litellm

from app.core.config import settings
from app.repositories.chat_repository import ChatRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.settings_repository import SettingsRepository
from app.infrastructure.vector_store import VectorStore
from app.services.intent_router import IntentRouterService
from app.services.context_compactor import ContextCompactorService
from app.infrastructure.exact_lookup import ExactLookupService
from app.core.security import decrypt_api_key

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self):
        self.vector_store = VectorStore()

    def _get_settings(self) -> dict:
        """Fetch system settings from SQLite DB."""
        return SettingsRepository.get_all_settings()

    def _create_or_get_session(self, user_id: int, session_id: Optional[str] = None) -> str:
        """Get existing active session or create a new one."""
        if session_id:
            session = ChatRepository.get_chat_session(session_id, user_id)
            if session:
                return session_id

        now = time.strftime("%Y-%m-%d %H:%M:%S")
        new_id = uuid.uuid4().hex[:12]
        ChatRepository.create_chat_session(new_id, user_id, "Chat Baru", now, now)
        return new_id

    def _search_documents(self, query: str) -> tuple[list[dict], list[dict], list[str]]:
        """
        Search vector store using Hybrid Search (FAISS + BM25 + RRF).
        Returns:
            - top_5_docs: Single product or top 5 documents used for AI LLM Context & Main Screen Cards
            - all_20_docs: Top 20 candidate documents displayed in RAG Inspector Showcase Panel
            - display_cols: Column display schema
        """
        all_20_docs = self.vector_store.search(query, top_k=20)
        col_row = CollectionRepository.get_collection(self.vector_store.active_collection_id)
        display_cols = json.loads(col_row["display_cols"]) if col_row else []

        if not all_20_docs:
            return [], [], display_cols

        top_5_docs = all_20_docs[:5]

        # Single product precision filter:
        # If user query specifically mentions an exact product title/code, filter to ONLY that 1 product card!
        lower_q = query.lower()
        exact_matches = []
        for doc in all_20_docs:
            for col in display_cols:
                val = str(doc.get(col, "")).strip().lower()
                if len(val) >= 4 and val in lower_q:
                    exact_matches.append(doc)
                    break

        if exact_matches:
            top_5_docs = exact_matches[:1]
        elif len(all_20_docs) > 1:
            # If user asks specific question ('berapa', 'harga', 'spesifikasi', 'stok')
            if any(k in lower_q for k in ["harga", "berapa", "spesifikasi", "stok", "tipe"]):
                top_5_docs = all_20_docs[:1]

        return top_5_docs, all_20_docs, display_cols

    def _build_context(self, documents: list[dict], display_cols: list[str]) -> str:
        """Build context string from top documents with clear Etalase # numbering."""
        if not documents:
            return "Tidak ada dokumen atau data relevan ditemukan."

        context_str = ""
        for idx, doc in enumerate(documents, 1):
            context_str += f"Etalase Produk #{idx}:\n"
            for col in display_cols:
                if col in doc:
                    context_str += f"- {col.capitalize()}: {doc[col]}\n"
            context_str += "\n"
        return context_str

    def _build_system_prompt(self, cfg: dict, context_str: str, user_msg: str) -> str:
        """Build system prompt incorporating custom prompt template from settings or default sales directives."""
        assistant_name = cfg.get("assistant_name", "Aiko")
        assistant_job = cfg.get("assistant_job", "Customer Service Toko Elektronik")
        custom_prompt = cfg.get("system_prompt", "").strip()

        if custom_prompt:
            try:
                formatted = custom_prompt.format(
                    name=assistant_name,
                    job=assistant_job,
                    context=context_str,
                    query=user_msg
                )
                return formatted
            except Exception:
                return f"{custom_prompt}\n\nKatalog Produk:\n{context_str}\n\nPertanyaan Pengguna: {user_msg}\nJawaban:"

        return (
            f"Kamu adalah {assistant_name}, seorang {assistant_job} yang ramah dan profesional.\n"
            "Panduan Menjawab Pertanyaan Pengguna:\n"
            "1. Jawablah dengan ramah, informatif, dan ringkas dalam Bahasa Indonesia.\n"
            "2. Jika pengguna bertanya tentang produk atau harga, sebutkan NAMA PRODUK dan HARGANYA saja.\n"
            "3. Arahkan pengguna untuk melihat detail lengkap produk pada nomor Etalase Produk yang tampil di layar (misal: 'Silakan cek detail lengkapnya pada Etalase Produk #1').\n"
            "4. Tidak perlu membacakan atau menuliskan daftar spesifikasi panjang di teks balasan.\n"
            "5. Gunakan kalimat yang utuh dan selesaikan kalimat sampai tuntas tanpa terpotong.\n"
            "6. Gunakan teknik hard selling, selalu sarankan mengecek etalase untuk produk yang lain.\n\n"
            f"Katalog Produk:\n{context_str}\n\n"
            f"Pertanyaan Pengguna: {user_msg}\n"
            "Jawaban:"
        )

    def _generate_conversational_speech(self, top_docs: list[dict], reply_text: str, user_msg: str) -> str:
        """
        Generate a natural, concise 1-2 sentence conversational sales recommendation for TTS.
        Avoids reading technical datasheets, raw currency strings, or markdown tables.
        """
        if not top_docs:
            return "Maaf kak, data produk yang Anda cari saat ini belum tersedia."

        first_doc = top_docs[0]
        product_name = (
            first_doc.get("nama_produk")
            or first_doc.get("judul")
            or first_doc.get("nama")
            or "produk di etalase nomor 1"
        )

        highlights = []
        for key in ["deskripsi", "fitur", "keunggulan", "kategori"]:
            if key in first_doc and first_doc[key]:
                val_words = str(first_doc[key]).split()[:6]
                highlights.append(" ".join(val_words))
                break

        summary = highlights[0] if highlights else "fitur dan kualitasnya sangat memadai"

        if len(top_docs) > 1:
            speech = f"Untuk kebutuhan Anda, saya lebih merekomendasikan etalase nomor 1 yaitu {product_name}. Alasannya karena {summary}."
        else:
            speech = f"Pilihan terbaik untuk pencarian ini adalah {product_name}. Fiturnya sudah sangat pas untuk kebutuhan Anda."

        return speech

    def _is_greeting(self, text: str) -> bool:
        greetings = [
            "halo", "hai", "selamat pagi", "selamat siang", "selamat sore",
            "selamat malam", "hi", "hello", "pagi", "siang", "sore", "malam",
            "assalamualaikum", "hei"
        ]
        cleaned = re.sub(r"[^\w\s]", "", text.lower().strip())
        words = cleaned.split()
        return any(w in greetings for w in words)

    def _completion_with_retry(self, max_retries: int = 3, base_delay: float = 1.5, **kwargs):
        """Wrapper litellm.completion() with retry mechanism."""
        last_error = None
        for attempt in range(max_retries):
            try:
                return litellm.completion(**kwargs)
            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                if any(kw in err_str for kw in ["rate limit", "429", "tpm", "rpm", "overloaded"]):
                    delay = base_delay * (2 ** attempt)
                    logger.warning("LLM API rate limited (attempt %d/%d). Retrying in %.1fs...", attempt + 1, max_retries, delay)
                    time.sleep(delay)
                else:
                    raise e
        if last_error is not None:
            raise last_error

    def _call_llm(self, system_prompt: str, messages: list[dict]) -> str:
        """Call LLM provider via LiteLLM."""
        cfg = self._get_settings()
        provider = cfg.get("llm_provider", "groq").lower()
        api_key = cfg.get("llm_api_key", "")
        if api_key:
            try:
                api_key = decrypt_api_key(api_key)
            except Exception:
                pass
            api_key = api_key.strip().strip('"').strip("'")
        model = cfg.get("llm_model", "llama-3.1-8b-instant")
        temperature = float(cfg.get("llm_temperature", "0.7"))
        max_tokens = int(cfg.get("llm_max_tokens", "1024"))

        llm_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            llm_messages.append({"role": m["role"], "content": m["content"]})

        kwargs = {
            "messages": llm_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if provider == "groq":
            kwargs["model"] = f"groq/{model}"
            kwargs["api_key"] = api_key
        elif provider == "openai":
            kwargs["model"] = model
            kwargs["api_key"] = api_key
        elif provider == "openrouter":
            kwargs["model"] = f"openrouter/{model}"
            kwargs["api_key"] = api_key
        elif provider == "ollama":
            kwargs["model"] = f"ollama/{model}"
            kwargs["api_base"] = settings.OLLAMA_BASE_URL
        else:
            kwargs["model"] = f"groq/{model}"
            kwargs["api_key"] = api_key

        try:
            response = self._completion_with_retry(**kwargs)
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error("LLM call failed: %s", e)
            return f"Maaf, terjadi kesalahan saat menghubungi layanan AI ({e})."

    def _call_llm_stream(self, system_prompt: str, messages: list[dict]) -> Generator[str, None, None]:
        """Stream LLM response via LiteLLM."""
        cfg = self._get_settings()
        provider = cfg.get("llm_provider", "groq").lower()
        api_key = cfg.get("llm_api_key", "")
        if api_key:
            try:
                api_key = decrypt_api_key(api_key)
            except Exception:
                pass
            api_key = api_key.strip().strip('"').strip("'")
        model = cfg.get("llm_model", "llama-3.1-8b-instant")
        temperature = float(cfg.get("llm_temperature", "0.7"))
        max_tokens = int(cfg.get("llm_max_tokens", "1024"))

        llm_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            llm_messages.append({"role": m["role"], "content": m["content"]})

        kwargs = {
            "messages": llm_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        if provider == "groq":
            kwargs["model"] = f"groq/{model}"
            kwargs["api_key"] = api_key
        elif provider == "openai":
            kwargs["model"] = model
            kwargs["api_key"] = api_key
        elif provider == "openrouter":
            kwargs["model"] = f"openrouter/{model}"
            kwargs["api_key"] = api_key
        elif provider == "ollama":
            kwargs["model"] = f"ollama/{model}"
            kwargs["api_base"] = settings.OLLAMA_BASE_URL
        else:
            kwargs["model"] = f"groq/{model}"
            kwargs["api_key"] = api_key

        try:
            response = self._completion_with_retry(**kwargs)
            for chunk in response:
                delta = chunk.choices[0].delta
                if hasattr(delta, "content") and delta.content:
                    yield delta.content
        except Exception as e:
            logger.error("LLM streaming failed: %s", e)
            yield f" [Error LLM: {e}]"

    def _get_chat_history(self, session_id: str, user_id: int, limit: int = 6) -> list[dict]:
        rows = ChatRepository.get_chat_messages(session_id, user_id)
        history = []
        for r in rows[-limit:]:
            history.append({"role": r["role"], "content": r["content"]})
        return history

    def _save_chat_message(self, user_id: int, role: str, content: str, session_id: str):
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        ChatRepository.create_chat_message(user_id, role, content, session_id, now)
        ChatRepository.update_chat_session_timestamp(session_id, now)

    def _format_items(self, documents: list[dict], display_cols: list[str]) -> list[dict]:
        items = []
        for doc in documents:
            item = {"id": doc.get("id")}
            for col in display_cols:
                if col in doc:
                    item[col] = doc[col]
            for col in doc:
                if col not in item and not col.startswith("_"):
                    item[col] = doc[col]
            items.append(item)
        return items

    def generate_text_response(self, user_msg: str, session_id: Optional[str] = None, user_id: int = 1) -> dict:
        """Generate full RAG text response with RAG Inspector Top 20 vs Screen Top 5 split."""
        cfg = self._get_settings()
        assistant_name = cfg.get("assistant_name", "Aiko")
        greeting_message = cfg.get("greeting_message", "Halo! Ada yang bisa saya bantu?")
        assistant_job = cfg.get("assistant_job", "Customer Service Toko Elektronik")

        session_id = self._create_or_get_session(user_id, session_id)

        # 1. Exact Fast-Path Lookup (<20ms)
        cached = ExactLookupService.get_cached_response(user_msg)
        if cached:
            self._save_chat_message(user_id, "user", user_msg, session_id)
            self._save_chat_message(user_id, "assistant", cached["reply"], session_id)
            cached["session_id"] = session_id
            return cached

        # 2. Intent Router
        intent_info = IntentRouterService.analyze_intent(user_msg)
        if not intent_info["need_rag"]:
            reply_text = greeting_message if intent_info["intent_type"] == "greeting" else "Sama-sama! Ada lagi yang ingin Anda tanyakan?"
            self._save_chat_message(user_id, "user", user_msg, session_id)
            self._save_chat_message(user_id, "assistant", reply_text, session_id)
            return {"reply": reply_text, "items": [], "all_items": [], "session_id": session_id, "fast_path": False}

        # 3. Hybrid Search: Top 5 for AI Context & Screen Cards, Top 20 for RAG Inspector Showcase
        top_5_docs, all_20_docs, display_cols = self._search_documents(user_msg)

        # 4. Context Compactor (Takes top 5)
        context_str, compact_docs = ContextCompactorService.compact_context(top_5_docs, display_cols)

        # Build system prompt dynamically from Admin Settings / Database
        system_prompt = self._build_system_prompt(cfg, context_str, user_msg)

        history = self._get_chat_history(session_id, user_id)
        messages = history + [{"role": "user", "content": user_msg}]

        # 5. LLM Synthesis
        reply = self._call_llm(system_prompt, messages)

        formatted_top5 = self._format_items(compact_docs, display_cols)
        formatted_all20 = self._format_items(all_20_docs, display_cols)

        self._save_chat_message(user_id, "user", user_msg, session_id)
        self._save_chat_message(user_id, "assistant", reply, session_id)
        if compact_docs and len(reply) > 20:
            ExactLookupService.set_cached_response(user_msg, reply, formatted_top5)

        return {
            "reply": reply,
            "items": formatted_top5,
            "all_items": formatted_all20,
            "session_id": session_id,
            "fast_path": False
        }

    def generate_streaming_response(self, user_msg: str, session_id: Optional[str] = None, user_id: int = 1) -> Generator[str, None, None]:
        """Generate streaming response with RAG context."""
        cfg = self._get_settings()
        assistant_name = cfg.get("assistant_name", "Aiko")
        greeting_message = cfg.get("greeting_message", "Halo! Ada yang bisa saya bantu?")
        assistant_job = cfg.get("assistant_job", "Customer Service Toko Elektronik")

        session_id = self._create_or_get_session(user_id, session_id)

        intent_info = IntentRouterService.analyze_intent(user_msg)
        if not intent_info["need_rag"]:
            reply_text = greeting_message if intent_info["intent_type"] == "greeting" else "Sama-sama! Ada lagi yang ingin Anda tanyakan?"
            self._save_chat_message(user_id, "user", user_msg, session_id)
            self._save_chat_message(user_id, "assistant", reply_text, session_id)
            yield json.dumps({"type": "reply", "text": reply_text, "session_id": session_id, "items": [], "all_items": []})
            return

        top_5_docs, all_20_docs, display_cols = self._search_documents(user_msg)
        context_str = self._build_context(top_5_docs, display_cols)
        system_prompt = self._build_system_prompt(cfg, context_str, user_msg)

        history = self._get_chat_history(session_id, user_id)
        messages = history + [{"role": "user", "content": user_msg}]

        self._save_chat_message(user_id, "user", user_msg, session_id)

        full_reply = ""
        for chunk in self._call_llm_stream(system_prompt, messages):
            full_reply += chunk
            yield json.dumps({"type": "chunk", "text": chunk, "session_id": session_id})

        self._save_chat_message(user_id, "assistant", full_reply, session_id)

        yield json.dumps({
            "type": "items",
            "items": self._format_items(top_5_docs, display_cols),
            "all_items": self._format_items(all_20_docs, display_cols),
            "session_id": session_id,
        })

    def generate_3d_response(self, user_msg: str, session_id: Optional[str] = None, user_id: int = 1) -> dict:
        """Generate 3D avatar response with single-flight instant audio synthesis."""
        cfg = self._get_settings()
        assistant_name = cfg.get("assistant_name", "Aiko")
        greeting_message = cfg.get("greeting_message", "Halo! Ada yang bisa saya bantu?")
        assistant_job = cfg.get("assistant_job", "Customer Service Toko Elektronik")

        session_id = self._create_or_get_session(user_id, session_id)

        if self._is_greeting(user_msg):
            self._save_chat_message(user_id, "user", user_msg, session_id)
            self._save_chat_message(user_id, "assistant", greeting_message, session_id)
            return {"reply": greeting_message, "speech_text": greeting_message, "items": [], "all_items": [], "audio_url": None, "session_id": session_id}

        top_5_docs, all_20_docs, display_cols = self._search_documents(user_msg)

        if not top_5_docs:
            speech = "Maaf kak, data dengan topik tersebut belum tersedia."
            self._save_chat_message(user_id, "user", user_msg, session_id)
            self._save_chat_message(user_id, "assistant", speech, session_id)
            return {"reply": speech, "speech_text": speech, "items": [], "all_items": [], "audio_url": None, "session_id": session_id}

        context_str = self._build_context(top_5_docs, display_cols)

        system_prompt = (
            f"Kamu adalah {assistant_name}, seorang {assistant_job} yang ramah dan profesional.\n"
            "Jawablah pertanyaan pengguna dengan jujur, ringkas, dan jelas berdasarkan konteks berikut.\n"
            "Jika informasi tidak terdapat pada konteks, jawablah dengan sopan bahwa kamu tidak tahu, dan jangan membuat-buat informasi.\n\n"
            f"Konteks:\n{context_str}\n\n"
            f"Pertanyaan Pengguna: {user_msg}\n"
            "Jawaban:"
        )

        history = self._get_chat_history(session_id, user_id)
        messages = history + [{"role": "user", "content": user_msg}]

        reply = self._call_llm(system_prompt, messages)

        # Use exact reply text for speech so TTS audio matches bubble chat 100%
        speech_text = reply

        # Synthesize audio server-side for single-flight zero-delay response
        audio_filename = None
        try:
            from app.services.speech_service import SpeechService
            speech_service = SpeechService()
            audio_filename = speech_service.speak(reply)
        except Exception as e:
            logger.warning("Failed server-side TTS synthesis: %s", e)

        audio_url = f"/api/audio/{audio_filename}" if audio_filename else None

        # LivePortrait Video Generation
        video_url = None
        if audio_url:
            try:
                from app.services.liveportrait_service import LivePortraitService
                char_image = cfg.get("avatar_char_image", "")
                video_url = LivePortraitService.generate_talking_video(char_image, audio_url)
            except Exception as e:
                logger.warning("LivePortrait video generation failed: %s", e)

        self._save_chat_message(user_id, "user", user_msg, session_id)
        self._save_chat_message(user_id, "assistant", reply, session_id)

        formatted_top5 = self._format_items(top_5_docs, display_cols)
        formatted_all20 = self._format_items(all_20_docs, display_cols)

        return {
            "reply": reply,
            "speech_text": speech_text,
            "items": formatted_top5,
            "all_items": formatted_all20,
            "audio_url": audio_url,
            "video_url": video_url,
            "session_id": session_id,
        }

    def get_user_sessions(self, user_id: int) -> list[dict]:
        rows = ChatRepository.get_chat_sessions_by_user(user_id)
        return [dict(r) for r in rows]

    def get_session_messages(self, session_id: str, user_id: int) -> list[dict]:
        rows = ChatRepository.get_chat_messages(session_id, user_id)
        return [dict(r) for r in rows]

    def delete_session(self, session_id: str, user_id: int) -> None:
        ChatRepository.delete_chat_session(session_id, user_id)


_chat_service_instance: Optional["ChatService"] = None


def get_chat_service() -> "ChatService":
    global _chat_service_instance
    if _chat_service_instance is None:
        _chat_service_instance = ChatService()
    return _chat_service_instance