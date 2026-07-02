import sqlite3
from typing import Optional
from app.infrastructure.database import get_db_connection

class SessionRepository:
    @staticmethod
    def create_session(token: str, user_id: int, role: str, created_at: str) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sessions (token, user_id, role, created_at) VALUES (?, ?, ?, ?)",
            (token, user_id, role, created_at)
        )
        conn.commit()
        conn.close()

    @staticmethod
    def get_session(token: str) -> Optional[sqlite3.Row]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, role, created_at FROM sessions WHERE token = ?",
            (token,)
        )
        row = cursor.fetchone()
        conn.close()
        return row

    @staticmethod
    def delete_session(token: str) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_active_session_count() -> int:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM sessions")
        row = cursor.fetchone()
        conn.close()
        return row["cnt"] if row else 0
