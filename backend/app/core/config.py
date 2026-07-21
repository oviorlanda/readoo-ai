import os
from dotenv import load_dotenv

# Load .env file from root directory
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
load_dotenv(os.path.join(base_dir, ".env"))


class Settings:
    # Server configuration
    PORT: int = int(os.getenv("PYTHON_PORT", 5000))
    HOST: str = os.getenv("PYTHON_HOST", "0.0.0.0")
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    # Seed Account Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin")
    DEMO_USERNAME: str = os.getenv("DEMO_USERNAME", "user")
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "user")

    # Database & Cache
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "data/readoo.db")
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))

    # Pure ONNX RAG Embedding Model (PyTorch-free)
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

    # Local Ollama Base URL
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    # Voice Fallback Defaults
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    TTS_PROVIDER: str = os.getenv("TTS_PROVIDER", "edge-tts")
    TTS_VOICE: str = os.getenv("TTS_VOICE", "id-ID-GadisNeural")
    TTS_RATE: str = os.getenv("TTS_RATE", "+0%")
    SUPERTONIC_VOICE: str = os.getenv("SUPERTONIC_VOICE", "W1")


settings = Settings()