import os
import logging

# Override Hugging Face cache directory to bypass Windows Home directory permission lock errors
base_dir = os.path.dirname(os.path.abspath(__file__))
cache_dir = os.path.join(base_dir, "data", ".cache")
os.makedirs(cache_dir, exist_ok=True)
os.environ["HF_HOME"] = cache_dir
os.environ["SENTENCE_TRANSFORMERS_HOME"] = cache_dir

from waitress import serve
from app import create_app
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("waitress")

# Create Flask application
app = create_app()

if __name__ == "__main__":
    print("\n========================================================================")
    print(f"  READOO AI BACKEND SERVER IS RUNNING ON http://localhost:{settings.PORT}")
    print("========================================================================\n", flush=True)
    logger.info("Starting Waitress production WSGI server on %s:%d", settings.HOST, settings.PORT)
    serve(app, host=settings.HOST, port=settings.PORT, threads=16)
