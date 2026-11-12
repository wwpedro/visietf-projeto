import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import re

load_dotenv()

# Pega a string única do .env
DB_URL = os.getenv("DATABASE_URL")

# BLINDAGEM: Limpa espaços e remove aspas acidentais
if DB_URL:
    DB_URL = DB_URL.strip().strip('"').strip("'")

    # CORREÇÃO CRÍTICA: SQLAlchemy 1.4+ exige 'postgresql://' em vez de 'postgres://'
    if DB_URL.startswith("postgres://"):
        DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

if not DB_URL:
    raise ValueError("ERRO FATAL: A variável DATABASE_URL não foi configurada.")

DB_URL = re.sub(r"^postgres(ql)?(\+\w+)?://", "postgresql+psycopg2://", DB_URL)
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()