import logging

from app.infrastructure.stt_client import STTClient
from app.infrastructure.tts_client import TTSClient

logger = logging.getLogger(__name__)


class SpeechService:
    def __init__(self):
        self.stt_client = STTClient()
        self.tts_client = TTSClient()

    def transcribe(self, audio_path):
        logger.info("Transcribing audio file: %s", audio_path)
        return self.stt_client.transcribe(audio_path)

    def speak(self, text):
        logger.info(
            "Synthesizing speech for: %s",
            text[:50] + "..." if len(text) > 50 else text,
        )
        return self.tts_client.speak(text)

    def speak_custom(self, text, provider, language, voice):
        import uuid
        import os
        filename = f"tts_test_{uuid.uuid4().hex[:8]}.mp3" if provider == "edge-tts" else f"tts_test_{uuid.uuid4().hex[:8]}.wav"
        output_path = os.path.join(self.tts_client.output_dir, filename)
        
        success = self.tts_client.synthesize_custom(text, output_path, provider, language, voice)
        if success:
            return filename
        return None
