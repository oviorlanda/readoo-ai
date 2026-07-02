import sqlite3
from typing import Optional, List
from app.infrastructure.database import get_db_connection

class ChatRepository:
    @staticmethod
    def create_chat_session(session_id: str, user_id: int, title: str, created_at: str, updated_at: str) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, user_id, title, created_at, updated_at)
        )
        conn.commit()
        conn.close()

    @staticmethod
    def get_chat_session(session_id: str, user_id: int) -> Optional[sqlite3.Row]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, created_at, updated_at FROM chat_sessions WHERE id = ? AND user_id = ?",
            (session_id, user_id)
        )
        row = cursor.fetchone()
        conn.close()
        return row

    @staticmethod
    def update_chat_session_title(session_id: str, user_id: int, title: str, updated_at: str) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (title, updated_at, session_id, user_id)
        )
        conn.commit()
        conn.close()

    @staticmethod
    def update_chat_session_timestamp(session_id: str, updated_at: str) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
            (updated_at, session_id)
        )
        conn.commit()
        conn.close()

    @staticmethod
    def delete_chat_session(session_id: str, user_id: int) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_history WHERE session_id = ? AND user_id = ?", (session_id, user_id))
        cursor.execute("DELETE FROM chat_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
        conn.commit()
        conn.close()

    @staticmethod
    def get_chat_sessions_by_user(user_id: int) -> List[sqlite3.Row]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, title, created_at, updated_at FROM chat_sessions 
               WHERE user_id = ? ORDER BY updated_at DESC""",
            (user_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        return rows

    @staticmethod
    def create_chat_message(user_id: int, role: str, content: str, session_id: str, created_at: str) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_history (user_id, role, content, session_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, role, content, session_id, created_at)
        )
        conn.commit()
        conn.close()

    @staticmethod
    def get_chat_messages(session_id: str, user_id: int) -> List[sqlite3.Row]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT role, content, created_at FROM chat_history 
               WHERE session_id = ? AND user_id = ? 
               ORDER BY id ASC""",
            (session_id, user_id)
        )
        rows = cursor.fetchall()
        conn.close()
        return rows
