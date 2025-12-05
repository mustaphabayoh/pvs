from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
import os

# Determine DATABASE_URL. Priority:
# 1) explicit DATABASE_URL
# 2) build from MYSQL_* env vars
# 3) fallback to local sqlite dev.db
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    mysql_user = os.getenv("MYSQL_USER")
    mysql_password = os.getenv("MYSQL_PASSWORD")
    mysql_host = os.getenv("MYSQL_HOST")
    mysql_db = os.getenv("MYSQL_DB")
    if mysql_user and mysql_host and mysql_db:
        # build a PyMySQL URL
        mysql_password = mysql_password or ""
        DATABASE_URL = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}/{mysql_db}?charset=utf8mb4"
    else:
        DATABASE_URL = "sqlite:///./dev.db"

# SQLite needs check_same_thread; other DBs don't
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args, pool_pre_ping=True)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
