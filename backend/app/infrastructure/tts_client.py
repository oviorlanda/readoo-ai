import os
import uuid
import logging
import asyncio

from app.core.config import settings
from app.repositories.settings_repository import SettingsRepository

logger = logging.getLogger(__name__)


def number_to_words_id(n: int, to_currency: bool = False) -> str:
    """Convert integer to Indonesian words using num2words if available, or fallback to built-in spell-out."""
    try:
        from num2words import num2words
        if to_currency:
            res = num2words(n, lang='id', to='currency')
            if res:
                return res
        res = num2words(n, lang='id')
        if res:
            return res
    except Exception:
        pass

    if n < 0:
        return "minus " + number_to_words_id(abs(n))
    if n == 0:
        return "nol"

    units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]

    if n < 12:
        return units[n]
    elif n < 20:
        return units[n - 10] + " belas"
    elif n < 100:
        remainder = n % 10
        return units[n // 10] + " puluh" + (" " + units[remainder] if remainder else "")
    elif n < 200:
        remainder = n % 100
        return "seratus" + (" " + number_to_words_id(remainder) if remainder else "")
    elif n < 1000:
        remainder = n % 100
        return units[n // 100] + " ratus" + (" " + number_to_words_id(remainder) if remainder else "")
    elif n < 2000:
        remainder = n % 1000
        return "seribu" + (" " + number_to_words_id(remainder) if remainder else "")
    elif n < 1000000:
        thousands = n // 1000
        remainder = n % 1000
        return number_to_words_id(thousands) + " ribu" + (" " + number_to_words_id(remainder) if remainder else "")
    elif n < 1000000000:
        millions = n // 1000000
        remainder = n % 1000000
        return number_to_words_id(millions) + " juta" + (" " + number_to_words_id(remainder) if remainder else "")
    elif n < 1000000000000:
        billions = n // 1000000000
        remainder = n % 1000000000
        return number_to_words_id(billions) + " miliar" + (" " + number_to_words_id(remainder) if remainder else "")
    else:
        trillions = n // 1000000000000
        remainder = n % 1000000000000
        return number_to_words_id(trillions) + " triliun" + (" " + number_to_words_id(remainder) if remainder else "")


def clean_text_for_tts(text: str) -> str:
    """Transform raw Markdown and technical datasheets into natural spoken Indonesian with full-text spelled numbers."""
    import re
    if not text:
        return ""

    # 1. Remove URLs & Markdown formatting
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'\*+|\#+|`+|~+', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)

    # 2. Format Currency (e.g. Rp 18.200.000 -> delapan belas juta dua ratus ribu rupiah)
    def _currency_replacer(match):
        val_str = match.group(1).replace(".", "").replace(",", "")
        try:
            val = int(val_str)
            words = number_to_words_id(val, to_currency=True)
            if "rupiah" not in words.lower():
                return f"{words} rupiah"
            return words
        except Exception:
            return match.group(0)

    text = re.sub(r'\bRp\s?([\d\.,]+)', _currency_replacer, text, flags=re.IGNORECASE)

    # 3. Format Numbers with Dot Separators (e.g. 150.000 -> seratus lima puluh ribu)
    def _formatted_num_replacer(match):
        val_str = match.group(0).replace(".", "")
        try:
            val = int(val_str)
            return number_to_words_id(val)
        except Exception:
            return match.group(0)

    text = re.sub(r'\b\d{1,3}(?:\.\d{3})+\b', _formatted_num_replacer, text)

    # 4. Format Units for Spoken Indonesian
    def _unit_replacer(spoken_unit):
        def repl(match):
            try:
                val = int(match.group(1))
                return f"{number_to_words_id(val)} {spoken_unit}"
            except Exception:
                return match.group(0)
        return repl

    text = re.sub(r'(\d+)\s?mAh', _unit_replacer('miliamper jam'), text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s?GB', _unit_replacer('gigabita'), text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s?TB', _unit_replacer('terabita'), text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s?MP', _unit_replacer('megapiksel'), text, flags=re.IGNORECASE)

    # 5. Convert ALL remaining standalone digits to full Indonesian words
    def _digit_replacer(match):
        try:
            val = int(match.group(0))
            return number_to_words_id(val)
        except Exception:
            return match.group(0)

    text = re.sub(r'\b\d+\b', _digit_replacer, text)

    # 6. Clean Bullet points & extra whitespace
    text = re.sub(r'^\s*[\-\*\•\d\.]+\s*', ' ', text, flags=re.MULTILINE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


class TTSClient:
    def __init__(self):
        # Fallback defaults from configuration
        self.provider = settings.TTS_PROVIDER
        self.voice = settings.TTS_VOICE
        self.rate = settings.TTS_RATE
        self.language = "id"

        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.output_dir = os.path.join(base_dir, "data", "voice", "tts")
        os.makedirs(self.output_dir, exist_ok=True)

        self._load_dynamic_config()

    def _load_dynamic_config(self):
        try:
            cfg = SettingsRepository.get_settings_by_keys(["tts_provider", "tts_voice", "tts_language"])
            self.provider = cfg.get("tts_provider", self.provider)
            self.voice = cfg.get("tts_voice", self.voice)
            self.language = cfg.get("tts_language", "id-ID")
        except Exception:
            logger.warning("Failed to load dynamic TTS settings, using defaults")

        # Initialize engines dynamically based on current provider
        if self.provider == "supertonic":
            if not hasattr(self, "tts_local"):
                try:
                    from supertonic import TTS
                    self.tts_local = TTS(auto_download=True)
                    logger.info("Supertonic TTS initialized")
                except Exception as e:
                    logger.warning("Failed to load Supertonic: %s. Falling back to edge-tts.", e)
                    self.provider = "edge-tts"

            if hasattr(self, "tts_local"):
                try:
                    self.style = self.tts_local.get_voice_style(voice_name=self.voice)
                except Exception:
                    logger.warning("Voice style %s not found in Supertonic, falling back to F1", self.voice)
                    self.style = self.tts_local.get_voice_style(voice_name="F1")

        if self.provider == "edge-tts":
            if not hasattr(self, "edge_tts_module"):
                try:
                    import edge_tts
                    self.edge_tts_module = edge_tts
                    logger.info("Edge-TTS initialized")
                except Exception as e:
                    logger.error("Failed to load edge-tts module: %s", e)

    def speak(self, text):
        if not text:
            return None

        # Transform raw Markdown / technical datasheets into natural spoken Indonesian
        text = clean_text_for_tts(text)

        # Reload configurations to reflect admin modifications
        self._load_dynamic_config()

        if self.provider == "supertonic":
            filename = f"tts_{uuid.uuid4().hex[:8]}.wav"
            output_path = os.path.join(self.output_dir, filename)
            try:
                # Supertonic language option (e.g. 'id' or 'en' derived from locale 'id-ID')
                lang_code = self.language.split("-")[0]
                wav, duration = self.tts_local.synthesize(text, voice_style=self.style, lang=lang_code)
                self.tts_local.save_audio(wav, output_path)
                return filename if os.path.isfile(output_path) else None
            except Exception:
                logger.exception("Supertonic TTS generation failed")
                return None
        else:
            filename = f"tts_{uuid.uuid4().hex[:8]}.mp3"
            output_path = os.path.join(self.output_dir, filename)
            try:
                asyncio.run(self._generate_edge(text, output_path))
                return filename if os.path.isfile(output_path) else None
            except RuntimeError:
                logger.error("Async event loop conflict during Edge-TTS generation")
                return None
            except Exception:
                logger.exception("Edge-TTS generation failed")
                return None

    async def _generate_edge(self, text, output_path):
        communicator = self.edge_tts_module.Communicate(
            text=text,
            voice=self.voice,
            rate=self.rate,
        )
        await communicator.save(output_path)

    def synthesize_custom(self, text, output_path, provider, language, voice):
        text = clean_text_for_tts(text)
        if provider == "supertonic":
            try:
                if not hasattr(self, "tts_local"):
                    from supertonic import TTS
                    self.tts_local = TTS(auto_download=True)
                
                lang_code = language.split("-")[0]
                try:
                    style = self.tts_local.get_voice_style(voice_name=voice)
                except Exception:
                    style = self.tts_local.get_voice_style(voice_name="F1")
                
                wav, duration = self.tts_local.synthesize(text, voice_style=style, lang=lang_code)
                self.tts_local.save_audio(wav, output_path)
                return True
            except Exception as e:
                logger.error("Custom Supertonic synthesis failed: %s", e)
                return False
        else:
            try:
                if not hasattr(self, "edge_tts_module"):
                    import edge_tts
                    self.edge_tts_module = edge_tts
                
                async def run_edge():
                    comm = self.edge_tts_module.Communicate(text=text, voice=voice, rate=self.rate)
                    await comm.save(output_path)
                
                try:
                    asyncio.run(run_edge())
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(run_edge())
                    loop.close()
                return True
            except Exception as e:
                logger.error("Custom Edge-TTS synthesis failed: %s", e)
                return False

