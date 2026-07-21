import os
import uuid
import logging
from flask import request, jsonify, send_from_directory

from app.api import api_bp
from app.api.middleware import require_auth
from app.repositories.settings_repository import SettingsRepository

logger = logging.getLogger(__name__)

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOADS_DIR = os.path.join(base_dir, "data", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


@api_bp.route("/uploads/<path:filename>", methods=["GET"])
def serve_uploaded_file(filename):
    """Serves uploaded user assets (avatar images, backgrounds, etc.)."""
    return send_from_directory(UPLOADS_DIR, filename)


@api_bp.route("/admin/avatar/upload-character", methods=["POST"])
@require_auth(role="admin")
def upload_avatar_character():
    """Uploads character avatar photo (PNG/JPG/WEBP)."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "Berkas foto karakter wajib diunggah"}), 400

        uploaded_file = request.files["file"]
        filename = uploaded_file.filename
        if not filename:
            return jsonify({"error": "Nama file tidak valid"}), 400

        ext = os.path.splitext(filename)[1].lower()
        allowed_exts = [".png", ".jpg", ".jpeg", ".webp"]
        if ext not in allowed_exts:
            return jsonify({"error": f"Format file tidak didukung. Dukungan: {', '.join(allowed_exts)}"}), 400

        saved_filename = f"avatar_char_{uuid.uuid4().hex[:8]}{ext}"
        saved_path = os.path.join(UPLOADS_DIR, saved_filename)
        uploaded_file.save(saved_path)

        image_url = f"/api/uploads/{saved_filename}"

        # Update database setting via repository
        SettingsRepository.save_setting("avatar_char_image", image_url)

        logger.info("Avatar character image updated: %s", image_url)
        return jsonify({"success": True, "avatar_char_image": image_url, "message": "Foto karakter berhasil diunggah"})
    except Exception as e:
        logger.exception("Failed to upload avatar character image: %s", e)
        return jsonify({"error": f"Gagal mengunggah foto karakter: {str(e)}"}), 500


@api_bp.route("/admin/avatar/upload-background", methods=["POST"])
@require_auth(role="admin")
def upload_avatar_background():
    """Uploads background photo (PNG/JPG/WEBP)."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "Berkas background wajib diunggah"}), 400

        uploaded_file = request.files["file"]
        filename = uploaded_file.filename
        if not filename:
            return jsonify({"error": "Nama file tidak valid"}), 400

        ext = os.path.splitext(filename)[1].lower()
        allowed_exts = [".png", ".jpg", ".jpeg", ".webp"]
        if ext not in allowed_exts:
            return jsonify({"error": f"Format file tidak didukung. Dukungan: {', '.join(allowed_exts)}"}), 400

        saved_filename = f"avatar_bg_{uuid.uuid4().hex[:8]}{ext}"
        saved_path = os.path.join(UPLOADS_DIR, saved_filename)
        uploaded_file.save(saved_path)

        image_url = f"/api/uploads/{saved_filename}"

        # Update database setting via repository
        SettingsRepository.save_setting("avatar_bg_image", image_url)

        logger.info("Avatar background image updated: %s", image_url)
        return jsonify({"success": True, "avatar_bg_image": image_url, "message": "Background berhasil diunggah"})
    except Exception as e:
        logger.exception("Failed to upload avatar background image: %s", e)
        return jsonify({"error": f"Gagal mengunggah background: {str(e)}"}), 500


@api_bp.route("/admin/avatar/reset-background", methods=["POST"])
@require_auth(role="admin")
def reset_avatar_background():
    """Resets background photo setting to default (empty string)."""
    try:
        SettingsRepository.save_setting("avatar_bg_image", "")
        logger.info("Avatar background image reset to default")
        return jsonify({"success": True, "avatar_bg_image": "", "message": "Background telah dikembalikan ke default"})
    except Exception as e:
        logger.exception("Failed to reset avatar background image: %s", e)
        return jsonify({"error": f"Gagal mereset background: {str(e)}"}), 500


@api_bp.route("/admin/avatar/reset-character", methods=["POST"])
@require_auth(role="admin")
def reset_avatar_character():
    """Resets character photo setting to empty string."""
    try:
        SettingsRepository.save_setting("avatar_char_image", "")
        logger.info("Avatar character image reset to empty")
        return jsonify({"success": True, "avatar_char_image": "", "message": "Foto karakter avatar berhasil dihapus"})
    except Exception as e:
        logger.exception("Failed to reset avatar character image: %s", e)
        return jsonify({"error": f"Gagal mereset foto karakter: {str(e)}"}), 500


@api_bp.route("/admin/avatar/upload-vrm", methods=["POST"])
@require_auth(role="admin")
def upload_avatar_vrm():
    """Uploads 3D VRM avatar model file."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "Berkas 3D VRM wajib diunggah"}), 400

        uploaded_file = request.files["file"]
        filename = uploaded_file.filename
        if not filename:
            return jsonify({"error": "Nama file tidak valid"}), 400

        ext = os.path.splitext(filename)[1].lower()
        allowed_exts = [".vrm"]
        if ext not in allowed_exts:
            return jsonify({"error": f"Format file tidak didukung. Hanya mendukung format {', '.join(allowed_exts)}"}), 400

        saved_filename = f"avatar_model_{uuid.uuid4().hex[:8]}{ext}"
        saved_path = os.path.join(UPLOADS_DIR, saved_filename)
        uploaded_file.save(saved_path)

        model_url = f"/api/uploads/{saved_filename}"

        # Update database setting
        SettingsRepository.save_setting("avatar_vrm_url", model_url)

        logger.info("Avatar VRM 3D model updated: %s", model_url)
        return jsonify({"success": True, "avatar_vrm_url": model_url, "message": "Model 3D VRM berhasil diunggah"})
    except Exception as e:
        logger.exception("Failed to upload avatar VRM model: %s", e)
        return jsonify({"error": f"Gagal mengunggah model 3D VRM: {str(e)}"}), 500


@api_bp.route("/admin/avatar/reset-vrm", methods=["POST"])
@require_auth(role="admin")
def reset_avatar_vrm():
    """Resets 3D VRM/GLB model setting to empty string."""
    try:
        SettingsRepository.save_setting("avatar_vrm_url", "")
        logger.info("Avatar VRM model reset to empty")
        return jsonify({"success": True, "avatar_vrm_url": "", "message": "Model 3D Avatar berhasil dihapus"})
    except Exception as e:
        logger.exception("Failed to reset avatar VRM model: %s", e)
        return jsonify({"error": f"Gagal mereset model 3D: {str(e)}"}), 500
