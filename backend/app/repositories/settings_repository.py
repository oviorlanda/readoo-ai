import sqlite3
from typing import Dict, List, Optional
from app.infrastructure.database import get_db_connection

class SettingsRepository:
    @staticmethod
    def get_all_settings() -> Dict[str, str]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        rows = cursor.fetchall()
        conn.close()
        return {r["key"]: r["value"] for r in rows}

    @staticmethod
    def get_settings_by_keys(keys: List[str]) -> Dict[str, str]:
        if not keys:
            return {}
        conn = get_db_connection()
        cursor = conn.cursor()
        placeholders = ",".join("?" for _ in keys)
        cursor.execute(
            f"SELECT key, value FROM settings WHERE key IN ({placeholders})",
            tuple(keys)
        )
        rows = cursor.fetchall()
        conn.close()
        return {r["key"]: r["value"] for r in rows}

    @staticmethod
    def save_setting(key: str, value: str) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
        conn.commit()
        conn.close()

    @staticmethod
    def save_settings(settings_dict: Dict[str, str]) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        for key, value in settings_dict.items():
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
        conn.commit()
        conn.close()
