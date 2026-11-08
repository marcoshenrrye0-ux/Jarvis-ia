import sqlite3
from pathlib import Path
from .config import get_settings

def connect():
    path = Path(get_settings().database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    with connect() as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user','assistant')),
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.execute('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id)')
