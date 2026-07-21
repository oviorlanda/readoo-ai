from flask import Blueprint

api_bp = Blueprint("api", __name__)

# Import sub-modules to register routes
from app.api import auth, chat, voice
from app.api.admin import collections, settings, dataset, llm, avatar

@api_bp.route("/health", methods=["GET"])
def health_check():
    return {"status": "ok", "service": "readoo-ai"}, 200