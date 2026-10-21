from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./nutrigen.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_database_schema():
    """Safely adds missing columns to SQLite database tables without data loss."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    
    # Tables to check
    column_defs = {
        "users": [
            ("saved_meal_plan", "TEXT"),
            ("saved_twin_simulation", "TEXT"),
        ],
        "progress_records": [
            ("record_date", "VARCHAR"),
            ("meal_checkins", "TEXT"),
            ("adherence_pct", "FLOAT"),
            ("completed_count", "INTEGER"),
            ("modified_count", "INTEGER"),
            ("replaced_count", "INTEGER"),
            ("skipped_count", "INTEGER"),
            ("pending_count", "INTEGER"),
            ("lab_measurements", "TEXT"),
            ("actual_nutrients", "TEXT"),
            ("notes", "TEXT"),
        ]
    }
    
    with engine.connect() as conn:
        for table_name, cols in column_defs.items():
            if inspector.has_table(table_name):
                existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                for col_name, col_type in cols:
                    if col_name not in existing_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        except Exception as e:
                            print(f"Notice: Column {col_name} on {table_name}: {e}")

# Automatically ensure schema migration on startup/import
try:
    ensure_database_schema()
except Exception as e:
    print(f"Schema check error: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

