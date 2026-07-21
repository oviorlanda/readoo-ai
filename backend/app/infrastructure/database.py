import os
import sqlite3
import logging
import bcrypt
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, settings.DATABASE_PATH)
DB_DIR = os.path.dirname(DB_PATH)


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_lengkap TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
    )
    """)

    # Create sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Create collections table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        embedding_cols TEXT NOT NULL,
        display_cols TEXT NOT NULL,
        active INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    # Create documents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    )
    """)

    # Create settings table (Dynamic LLM, TTS, and UI Settings)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Create chat_history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        session_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Create chat_sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT DEFAULT 'Chat Baru',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Insert default settings if not exist (Admin Panel Managed)
    default_settings = [
        ("assistant_name", "Aiko"),
        ("greeting_message", "Halo! Saya asisten AI Anda. Ada yang bisa saya bantu hari ini?"),
        ("system_prompt", "Kamu adalah asisten AI bernama {name} yang ramah. Jawab pertanyaan pengguna menggunakan konteks berikut:\n\n{context}\n\nPertanyaan pengguna: {query}\n\nJawablah dengan sopan, informatif, dan ringkas dalam bahasa Indonesia .\n\nPanduan Menjawab Pertanyaan Pengguna:\n1. Jawablah dengan ramah, informatif, dan ringkas dalam Bahasa Indonesia.\n2. Jika pengguna bertanya tentang produk atau harga, sebutkan NAMA PRODUK dan HARGANYA saja.\n3. Arahkan pengguna untuk melihat detail lengkap produk pada nomor Etalase Produk yang tampil di layar (misal: 'Silakan cek detail lengkapnya pada Etalase Produk #1').\n4. Tidak perlu membacakan atau menuliskan daftar spesifikasi panjang di teks balasan.\n5. Gunakan kalimat yang utuh dan selesaikan kalimat sampai tuntas tanpa terpotong.\n6. Gunakan teknik hard selling, selalu sarankan mengecek etalase untuk produk yang lain."),
        ("llm_provider", "groq"),
        ("llm_model", "llama-3.1-8b-instant"),
        ("llm_api_key", ""),
        ("tts_language", "id-ID"),
        ("tts_voice", "id-ID-GadisNeural"),
        ("tts_provider", "edge-tts"),
        ("llm_max_tokens", "1024"),
        ("llm_temperature", "0.7"),
        ("avatar_char_image", ""),
        ("avatar_bg_image", ""),
        ("avatar_vrm_url", ""),
        ("avatar_offset_x", "0"),
        ("avatar_offset_y", "0"),
        ("avatar_scale", "1.0"),
        ("avatar_rotation", "0"),
        ("avatar_is_mirrored", "false")
    ]
    for key, value in default_settings:
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))

    # Insert seed users from environment settings if not exist
    cursor.execute("SELECT id FROM users WHERE email = ?", (settings.ADMIN_USERNAME,))
    if not cursor.fetchone():
        admin_pass = bcrypt.hashpw(settings.ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        cursor.execute(
            "INSERT INTO users (nama_lengkap, email, password_hash, role) VALUES (?, ?, ?, ?)",
            ("Administrator", settings.ADMIN_USERNAME, admin_pass, "admin")
        )
        logger.info("Admin user '%s' seeded successfully from environment settings", settings.ADMIN_USERNAME)

    cursor.execute("SELECT id FROM users WHERE email = ?", (settings.DEMO_USERNAME,))
    if not cursor.fetchone():
        user_pass = bcrypt.hashpw(settings.DEMO_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        cursor.execute(
            "INSERT INTO users (nama_lengkap, email, password_hash, role) VALUES (?, ?, ?, ?)",
            ("User Demo", settings.DEMO_USERNAME, user_pass, "user")
        )
        logger.info("Demo user '%s' seeded successfully from environment settings", settings.DEMO_USERNAME)

    conn.commit()
    conn.close()
    logger.info("Database initialized successfully at %s", DB_PATH)